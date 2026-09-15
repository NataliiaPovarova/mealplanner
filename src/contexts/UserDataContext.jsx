import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { setUserIngredients } from "../constants";
import { db } from "../firebase";
import { PLAN_VERSION } from "../utils/planEntries";
import { useAuth } from "./AuthContext";

const EMPTY = {
  recipeOverlay: [], products: [], customIngredients: [],
  ingredientDefaults: {}, plan: null, dishTags: null, tour: null,
};

const UserDataContext = createContext(null);

const PLAN_DOC_ID = "current";

/** Firestore caps a batch at 500 operations. */
const MAX_BATCH_WRITES = 500;

export function UserDataProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid || null;

  const [recipeOverlay, setRecipeOverlay] = useState(EMPTY.recipeOverlay);
  const [products, setProducts] = useState(EMPTY.products);
  const [customIngredients, setCustomIngredients] = useState(EMPTY.customIngredients);
  const [ingredientDefaults, setIngredientDefaults] = useState(EMPTY.ingredientDefaults);
  const [plan, setPlan] = useState(EMPTY.plan);
  const [dishTags, setDishTags] = useState(EMPTY.dishTags);
  const [tour, setTour] = useState(EMPTY.tour);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid || !db) {
      setRecipeOverlay(EMPTY.recipeOverlay);
      setProducts(EMPTY.products);
      // Signing out must take the previous account's ingredients out of the
      // shared catalog too, not just out of this provider's state.
      setUserIngredients(EMPTY.customIngredients);
      setCustomIngredients(EMPTY.customIngredients);
      setIngredientDefaults(EMPTY.ingredientDefaults);
      setPlan(EMPTY.plan);
      setDishTags(EMPTY.dishTags);
      setTour(EMPTY.tour);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const withIds = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // The week plan is pruned of entries the catalog cannot resolve, so loading
    // is only over once both the recipes and the ingredients have arrived.
    const pending = new Set(["recipes", "ingredients"]);
    const arrived = (collectionName) => {
      pending.delete(collectionName);
      if (!pending.size) setLoading(false);
    };

    const unsubscribers = [
      onSnapshot(collection(db, "users", uid, "recipes"), (snap) => {
        setRecipeOverlay(withIds(snap));
        arrived("recipes");
      }),
      onSnapshot(collection(db, "users", uid, "ingredients"), (snap) => {
        const docs = withIds(snap);
        // Into the catalog first: every consumer re-renders off the state below.
        setUserIngredients(docs);
        setCustomIngredients(docs);
        arrived("ingredients");
      }),
      onSnapshot(collection(db, "users", uid, "products"), (snap) => setProducts(withIds(snap))),
      onSnapshot(doc(db, "users", uid), (snap) => {
        const settings = snap.data()?.settings;
        setIngredientDefaults(settings?.ingredientDefaults || {});
        // Null means "not read yet"; an empty object means "read, nothing stored".
        setDishTags(settings?.dishTags || {});
        setTour(settings?.tour || {});
      }),
      onSnapshot(doc(db, "users", uid, "plans", PLAN_DOC_ID), (snap) => {
        setPlan(snap.exists() ? snap.data() : { weekPlan: {} });
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [uid]);

  const value = useMemo(() => {
    const userDoc = () => doc(db, "users", uid);
    const recipeDoc = (id) => doc(db, "users", uid, "recipes", id);
    const productDoc = (id) => doc(db, "users", uid, "products", id);
    const ingredientDoc = (id) => doc(db, "users", uid, "ingredients", id);

    return {
      uid,
      enabled: Boolean(uid && db),
      loading,
      recipeOverlay,
      products,
      customIngredients,
      ingredientDefaults,
      plan,
      dishTags,
      tour,

      /** Own recipe: no baseId. Override of a base recipe: doc id === base id. */
      saveOwnRecipe: (id, data) =>
        setDoc(recipeDoc(id || crypto.randomUUID()), { ...data, baseId: null }),
      saveBaseOverride: (baseId, data) =>
        setDoc(recipeDoc(baseId), { ...data, baseId }),
      hideBaseRecipe: (baseId) =>
        setDoc(recipeDoc(baseId), { baseId, deleted: true }),
      /** Drops the overlay doc, so a base recipe returns to its shipped version. */
      removeRecipeOverlay: (id) => deleteDoc(recipeDoc(id)),

      saveProduct: (id, data) => setDoc(productDoc(id || crypto.randomUUID()), data),
      deleteProduct: (id) => deleteDoc(productDoc(id)),

      /**
       * An ingredient of the user's own. The document id *is* the ingredient id
       * the plan and the recipes store, so it is generated with the `my:` prefix
       * by the caller rather than left to Firestore.
       */
      saveCustomIngredient: (id, data) => setDoc(ingredientDoc(id), data),
      deleteCustomIngredient: (id) => deleteDoc(ingredientDoc(id)),

      setIngredientDefault: (ingredientId, productId) =>
        setDoc(
          userDoc(),
          { settings: { ingredientDefaults: { [ingredientId]: productId || deleteField() } } },
          { merge: true },
        ),

      /** Replaces the document, so the pre-v2 `weekAddOns` map disappears on first save. */
      savePlan: (weekPlan) =>
        setDoc(doc(db, "users", uid, "plans", PLAN_DOC_ID), { version: PLAN_VERSION, weekPlan }),

      /**
       * Personal tags: the definitions plus which dish carries which tag.
       * `mergeFields` replaces the whole map, otherwise a removed tag would
       * survive as a leftover key of a deep merge.
       */
      saveDishTags: (nextDishTags) =>
        setDoc(userDoc(), { settings: { dishTags: nextDishTags } }, { mergeFields: ["settings.dishTags"] }),

      /** Which onboarding tours this account has already been through. */
      saveTour: (nextTour) =>
        setDoc(userDoc(), { settings: { tour: nextTour } }, { mergeFields: ["settings.tour"] }),

      /** Restores an exported backup. Existing documents with the same id are overwritten. */
      importData: async (payload) => {
        const recipes = payload.recipes || [];
        const importedProducts = payload.products || [];
        const importedIngredients = payload.ingredients || [];
        const writes = recipes.length + importedProducts.length + importedIngredients.length;
        if (writes + 2 > MAX_BATCH_WRITES) {
          throw new Error("import-too-large");
        }

        const batch = writeBatch(db);
        for (const { id, ...data } of recipes) batch.set(recipeDoc(id), data);
        for (const { id, ...data } of importedProducts) batch.set(productDoc(id), data);
        for (const { id, ...data } of importedIngredients) batch.set(ingredientDoc(id), data);
        const settings = {};
        if (payload.ingredientDefaults) settings.ingredientDefaults = payload.ingredientDefaults;
        if (payload.dishTags) settings.dishTags = payload.dishTags;
        if (Object.keys(settings).length) {
          batch.set(userDoc(), { settings }, { merge: true });
        }
        if (payload.plan) {
          batch.set(doc(db, "users", uid, "plans", PLAN_DOC_ID), payload.plan);
        }
        await batch.commit();
      },
    };
  }, [uid, loading, recipeOverlay, products, customIngredients, ingredientDefaults, plan, dishTags, tour]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) throw new Error("useUserData must be used inside <UserDataProvider>");
  return context;
}
