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
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const EMPTY = { recipeOverlay: [], products: [], ingredientDefaults: {}, plan: null };

const UserDataContext = createContext(null);

const PLAN_DOC_ID = "current";

/** Firestore caps a batch at 500 operations. */
const MAX_BATCH_WRITES = 500;

export function UserDataProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid || null;

  const [recipeOverlay, setRecipeOverlay] = useState(EMPTY.recipeOverlay);
  const [products, setProducts] = useState(EMPTY.products);
  const [ingredientDefaults, setIngredientDefaults] = useState(EMPTY.ingredientDefaults);
  const [plan, setPlan] = useState(EMPTY.plan);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid || !db) {
      setRecipeOverlay(EMPTY.recipeOverlay);
      setProducts(EMPTY.products);
      setIngredientDefaults(EMPTY.ingredientDefaults);
      setPlan(EMPTY.plan);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const withIds = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const unsubscribers = [
      onSnapshot(collection(db, "users", uid, "recipes"), (snap) => {
        setRecipeOverlay(withIds(snap));
        setLoading(false);
      }),
      onSnapshot(collection(db, "users", uid, "products"), (snap) => setProducts(withIds(snap))),
      onSnapshot(doc(db, "users", uid), (snap) => {
        setIngredientDefaults(snap.data()?.settings?.ingredientDefaults || {});
      }),
      onSnapshot(doc(db, "users", uid, "plans", PLAN_DOC_ID), (snap) => {
        setPlan(snap.exists() ? snap.data() : { weekPlan: {}, weekAddOns: {} });
      }),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [uid]);

  const value = useMemo(() => {
    const userDoc = () => doc(db, "users", uid);
    const recipeDoc = (id) => doc(db, "users", uid, "recipes", id);
    const productDoc = (id) => doc(db, "users", uid, "products", id);

    return {
      uid,
      enabled: Boolean(uid && db),
      loading,
      recipeOverlay,
      products,
      ingredientDefaults,
      plan,

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

      setIngredientDefault: (ingredientId, productId) =>
        setDoc(
          userDoc(),
          { settings: { ingredientDefaults: { [ingredientId]: productId || deleteField() } } },
          { merge: true },
        ),

      savePlan: (weekPlan, weekAddOns) =>
        setDoc(doc(db, "users", uid, "plans", PLAN_DOC_ID), { weekPlan, weekAddOns }),

      /** Restores an exported backup. Existing documents with the same id are overwritten. */
      importData: async (payload) => {
        const recipes = payload.recipes || [];
        const importedProducts = payload.products || [];
        if (recipes.length + importedProducts.length + 2 > MAX_BATCH_WRITES) {
          throw new Error("import-too-large");
        }

        const batch = writeBatch(db);
        for (const { id, ...data } of recipes) batch.set(recipeDoc(id), data);
        for (const { id, ...data } of importedProducts) batch.set(productDoc(id), data);
        if (payload.ingredientDefaults) {
          batch.set(
            userDoc(),
            { settings: { ingredientDefaults: payload.ingredientDefaults } },
            { merge: true },
          );
        }
        if (payload.plan) {
          batch.set(doc(db, "users", uid, "plans", PLAN_DOC_ID), payload.plan);
        }
        await batch.commit();
      },
    };
  }, [uid, loading, recipeOverlay, products, ingredientDefaults, plan]);

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) throw new Error("useUserData must be used inside <UserDataProvider>");
  return context;
}
