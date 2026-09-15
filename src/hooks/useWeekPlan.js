import { useEffect, useMemo, useRef, useState } from "react";
import { DAYS, SLOTS, ingredientCatalog } from "../constants";
import { useUserData } from "../contexts/UserDataContext";
import { brandOverridesFor } from "../utils/userRecipes";
import {
  KIND_INGREDIENT,
  KIND_RECIPE,
  PLAN_VERSION,
  ROLE_ADDON,
  countPlannedDishes,
  dishesInSlot,
  makeAddOn,
  makeDish,
  mealsById,
  normalizeWeekPlan,
  sumDayNutrition,
} from "../utils/planEntries";

const cellKey = (day, slot) => `${day}-${slot}`;

const STORAGE_KEY = "week-plan";
const SAVE_DEBOUNCE_MS = 600;

function loadLocalPlan() {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    // v2 wraps the plan in `{ version, weekPlan }`; older builds stored either
    // `{ weekPlan, weekAddOns }` or the bare cell map, and both still migrate.
    return normalizeWeekPlan(parsed.weekPlan || parsed, parsed.weekAddOns);
  } catch {
    return {};
  }
}

function entryExists(entry, knownRecipeIds) {
  return entry.kind === KIND_INGREDIENT
    ? Boolean(ingredientCatalog[entry.id])
    : knownRecipeIds.has(entry.id);
}

/** Drops dishes and add-ons whose recipe or ingredient is gone, keeping identity when nothing changed. */
function pruneMissing(weekPlan, knownRecipeIds) {
  let changed = false;
  const next = {};

  for (const [cell, dishes] of Object.entries(weekPlan)) {
    const kept = [];
    for (const dish of dishes) {
      if (!entryExists(dish, knownRecipeIds)) {
        changed = true;
        continue;
      }
      const addOns = (dish.addOns || []).filter((addOn) => entryExists(addOn, knownRecipeIds));
      if (addOns.length !== (dish.addOns || []).length) {
        changed = true;
        kept.push({ ...dish, addOns });
      } else {
        kept.push(dish);
      }
    }
    if (kept.length) next[cell] = kept;
    else if (dishes.length) changed = true;
  }

  return changed ? next : weekPlan;
}

export default function useWeekPlan(meals) {
  const {
    uid, enabled, loading, plan, products, ingredientDefaults, customIngredients, savePlan,
  } = useUserData();

  const [weekPlan, setWeekPlan] = useState(loadLocalPlan);
  const [dismissedWarnings, setDismissedWarnings] = useState({});

  const hydratedUid = useRef(null);
  const persistedRef = useRef(null);
  const localRef = useRef(weekPlan);
  localRef.current = weekPlan;

  const byId = useMemo(() => mealsById(meals), [meals]);
  const overrides = useMemo(
    () => brandOverridesFor(products, ingredientDefaults),
    [products, ingredientDefaults],
  );
  // `customIngredients` is not read here: it is a signal that the merged catalog
  // behind `entryNutrition` changed, which the context object has to reflect.
  const nutritionContext = useMemo(
    () => ({ byId, overrides }),
    [byId, overrides, customIngredients],
  );

  // The stored plan wins right after sign-in; local edits win from then on.
  useEffect(() => {
    if (!enabled) {
      // Signing out must not leave the previous account's plan on the device.
      if (hydratedUid.current) {
        hydratedUid.current = null;
        persistedRef.current = null;
        setWeekPlan({});
      }
      return;
    }
    if (!plan || hydratedUid.current === uid) return;
    hydratedUid.current = uid;

    const stored = normalizeWeekPlan(plan.weekPlan, plan.weekAddOns);

    // Signing up mid-planning should carry the plan into the new account rather
    // than replacing it with an empty stored one.
    if (!Object.keys(stored).length && Object.keys(localRef.current).length) return;

    persistedRef.current = JSON.stringify(stored);
    setWeekPlan(stored);
  }, [enabled, uid, plan]);

  useEffect(() => {
    const serialized = JSON.stringify(weekPlan);
    if (serialized === persistedRef.current) return undefined;

    if (!enabled) {
      persistedRef.current = serialized;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: PLAN_VERSION, weekPlan }));
      }
      return undefined;
    }

    // Never write before the stored plan has been read, or an empty local state
    // would wipe the saved one.
    if (hydratedUid.current !== uid) return undefined;

    const timer = setTimeout(() => {
      persistedRef.current = serialized;
      savePlan(weekPlan).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [weekPlan, enabled, uid, savePlan]);

  // A recipe or an ingredient can disappear when the user deletes or hides it.
  useEffect(() => {
    // While the overlay is still arriving the user's own recipe and ingredient
    // ids are unknown, so pruning would drop dishes that are actually valid.
    if (enabled && (loading || hydratedUid.current !== uid)) return;
    const knownRecipeIds = new Set(meals.map((meal) => meal.id));
    setWeekPlan((prev) => pruneMissing(prev, knownRecipeIds));
  }, [meals, enabled, loading, uid, customIngredients]);

  const updateSlot = (day, slot, updater) => {
    const key = cellKey(day, slot);
    setWeekPlan((prev) => {
      const nextDishes = updater(dishesInSlot(prev, key));
      const next = { ...prev };
      if (nextDishes.length) next[key] = nextDishes;
      else delete next[key];
      return next;
    });
  };

  const updateDish = (day, slot, dishKey, patch) =>
    updateSlot(day, slot, (dishes) =>
      dishes.map((dish) => (dish.key === dishKey ? { ...dish, ...patch(dish) } : dish)));

  /** `draft` is `{ kind, id }` plus an optional amount; portions come from the catalog. */
  const addDish = (day, slot, draft) => {
    setWeekPlan((prev) => {
      const next = { ...prev };
      const key = cellKey(day, slot);
      next[key] = [...dishesInSlot(prev, key), makeDish(draft)];

      // A batch recipe covers several days, so it lands in the same slot ahead —
      // unless that slot already has it.
      const meal = draft.kind === KIND_RECIPE ? byId.get(draft.id) : null;
      if (meal?.batchDays > 1) {
        const dayIndex = DAYS.indexOf(day);
        for (let ahead = 1; ahead < meal.batchDays; ahead += 1) {
          const laterDay = DAYS[dayIndex + ahead];
          if (!laterDay) break;
          const laterKey = cellKey(laterDay, slot);
          const existing = dishesInSlot(next, laterKey);
          if (existing.some((dish) => dish.kind === KIND_RECIPE && dish.id === meal.id)) continue;
          next[laterKey] = [...existing, makeDish(draft)];
        }
      }
      return next;
    });
  };

  const removeDish = (day, slot, dishKey) =>
    updateSlot(day, slot, (dishes) => dishes.filter((dish) => dish.key !== dishKey));

  const setDishAmount = (day, slot, dishKey, amount) =>
    updateDish(day, slot, dishKey, () => ({ amount }));

  const addAddOn = (day, slot, dishKey, draft) =>
    updateDish(day, slot, dishKey, (dish) => ({
      addOns: [...(dish.addOns || []), makeAddOn({ ...draft, role: ROLE_ADDON })],
    }));

  const removeAddOn = (day, slot, dishKey, addOnKey) =>
    updateDish(day, slot, dishKey, (dish) => ({
      addOns: (dish.addOns || []).filter((addOn) => addOn.key !== addOnKey),
    }));

  const setAddOnAmount = (day, slot, dishKey, addOnKey, amount) =>
    updateDish(day, slot, dishKey, (dish) => ({
      addOns: (dish.addOns || []).map((addOn) => (
        addOn.key === addOnKey ? { ...addOn, amount } : addOn
      )),
    }));

  const clearSlot = (day, slot) => updateSlot(day, slot, () => []);

  const clearAll = () => {
    setWeekPlan({});
    setDismissedWarnings({});
  };

  const getBatchWarnings = () => {
    const counted = {};
    for (const slot of SLOTS) {
      for (const day of DAYS) {
        for (const dish of dishesInSlot(weekPlan, cellKey(day, slot))) {
          if (dish.kind !== KIND_RECIPE) continue;
          const countKey = `${dish.id}|${slot}`;
          counted[countKey] = (counted[countKey] || 0) + 1;
        }
      }
    }

    const warnings = [];
    for (const [countKey, count] of Object.entries(counted)) {
      const [mealId, slot] = countKey.split("|");
      const meal = byId.get(mealId);
      if (!meal || !(meal.batchDays > 1) || count === meal.batchDays) continue;
      const dismissKey = `${countKey}|${count}`;
      if (dismissedWarnings[dismissKey]) continue;
      warnings.push({ meal, count, expected: meal.batchDays, dismissKey, slot });
    }
    return warnings;
  };

  const dismissWarning = (dismissKey) =>
    setDismissedWarnings((prev) => ({ ...prev, [dismissKey]: true }));

  const getDayKBJU = (day) =>
    sumDayNutrition(day, weekPlan, { byId, overrides, cellKey, slots: SLOTS });

  return {
    weekPlan, cellKey, nutritionContext, overrides,
    plannedDishes: countPlannedDishes(weekPlan),
    dishesInSlot: (day, slot) => dishesInSlot(weekPlan, cellKey(day, slot)),
    addDish, removeDish, setDishAmount,
    addAddOn, removeAddOn, setAddOnAmount,
    clearSlot, clearAll,
    getBatchWarnings, dismissWarning, getDayKBJU,
  };
}
