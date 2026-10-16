import { useEffect, useMemo, useRef, useState } from "react";
import { SLOTS, ingredientCatalog } from "../constants";
import { useUserData } from "../contexts/UserDataContext";
import { brandOverridesFor } from "../utils/userRecipes";
import {
  defaultPlanDays,
  dropOrphanCells,
  newDayId,
  normalizePlanDays,
  parseIsoDate,
  shiftIsoDate,
} from "../utils/planDays";
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

/** Cells and day blocks from any stored shape; a missing `days` means the default week. */
function readPlan({ weekPlan, weekAddOns, days }) {
  const cells = normalizeWeekPlan(weekPlan, weekAddOns);
  const planDays = normalizePlanDays(days, cells);
  return { weekPlan: dropOrphanCells(cells, planDays), days: planDays };
}

function loadLocalPlan() {
  const empty = { weekPlan: {}, days: defaultPlanDays() };
  if (typeof localStorage === "undefined") return empty;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    // v2 wraps the plan in `{ version, weekPlan, days }`; older builds stored either
    // `{ weekPlan, weekAddOns }` or the bare cell map, and both still migrate.
    return readPlan({ weekPlan: parsed.weekPlan || parsed, weekAddOns: parsed.weekAddOns, days: parsed.days });
  } catch {
    return empty;
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

  const [initialPlan] = useState(loadLocalPlan);
  const [weekPlan, setWeekPlan] = useState(initialPlan.weekPlan);
  const [days, setDays] = useState(initialPlan.days);
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
        setDays(defaultPlanDays());
      }
      return;
    }
    if (!plan || hydratedUid.current === uid) return;
    hydratedUid.current = uid;

    const stored = readPlan(plan);

    // Signing up mid-planning should carry the plan into the new account rather
    // than replacing it with an empty stored one.
    if (!Object.keys(stored.weekPlan).length && Object.keys(localRef.current).length) return;

    persistedRef.current = JSON.stringify(stored);
    setWeekPlan(stored.weekPlan);
    setDays(stored.days);
  }, [enabled, uid, plan]);

  useEffect(() => {
    const serialized = JSON.stringify({ weekPlan, days });
    if (serialized === persistedRef.current) return undefined;

    if (!enabled) {
      persistedRef.current = serialized;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: PLAN_VERSION, weekPlan, days }));
      }
      return undefined;
    }

    // Never write before the stored plan has been read, or an empty local state
    // would wipe the saved one.
    if (hydratedUid.current !== uid) return undefined;

    const timer = setTimeout(() => {
      persistedRef.current = serialized;
      savePlan({ weekPlan, days }).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [weekPlan, days, enabled, uid, savePlan]);

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
        const dayIndex = days.findIndex((planDay) => planDay.id === day);
        for (let ahead = 1; ahead < meal.batchDays; ahead += 1) {
          const laterDay = days[dayIndex + ahead]?.id;
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

  /** A fresh plan starts over from the default week, not from the last layout. */
  const clearAll = () => {
    setWeekPlan({});
    setDays(defaultPlanDays());
    setDismissedWarnings({});
  };

  const addDay = () =>
    setDays((prev) => {
      const last = prev[prev.length - 1];
      const date = last ? shiftIsoDate(last.date, 1) : defaultPlanDays()[0].date;
      return [...prev, { id: newDayId(), date }];
    });

  /** Its dishes go with it, so the shopping list stops counting them. */
  const removeDay = (dayId) => {
    if (days.length <= 1) return;
    const remaining = days.filter((day) => day.id !== dayId);
    setDays(remaining);
    setWeekPlan((prev) => dropOrphanCells(prev, remaining));
  };

  const setDayDate = (dayId, date) => {
    if (!parseIsoDate(date)) return;
    setDays((prev) => prev.map((day) => (day.id === dayId ? { ...day, date } : day)));
  };

  const getBatchWarnings = () => {
    const counted = {};
    for (const slot of SLOTS) {
      for (const { id: day } of days) {
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
    weekPlan, days, cellKey, nutritionContext, overrides,
    plannedDishes: countPlannedDishes(weekPlan),
    dishesInSlot: (day, slot) => dishesInSlot(weekPlan, cellKey(day, slot)),
    addDay, removeDay, setDayDate,
    addDish, removeDish, setDishAmount,
    addAddOn, removeAddOn, setAddOnAmount,
    clearSlot, clearAll,
    getBatchWarnings, dismissWarning, getDayKBJU,
  };
}
