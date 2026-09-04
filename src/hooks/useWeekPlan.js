import { useEffect, useRef, useState } from "react";
import { DAYS, SLOTS, SLOT_TAG_MAP, ADDON_TAG } from "../constants";
import { sumDayNutrition } from "../utils/nutrition";
import { useUserData } from "../contexts/UserDataContext";

const cellKey = (day, slot) => `${day}-${slot}`;

const STORAGE_KEY = "week-plan";
const SAVE_DEBOUNCE_MS = 600;

function loadLocalPlan() {
  if (typeof localStorage === "undefined") return { weekPlan: {}, weekAddOns: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { weekPlan: parsed.weekPlan || {}, weekAddOns: parsed.weekAddOns || {} };
  } catch {
    return { weekPlan: {}, weekAddOns: {} };
  }
}

/** Drops slots pointing at recipes that no longer exist, keeping identity when nothing changed. */
function pruneMissing(assignments, knownIds) {
  const kept = Object.entries(assignments).filter(([, mealId]) => knownIds.has(mealId));
  return kept.length === Object.keys(assignments).length
    ? assignments
    : Object.fromEntries(kept);
}

export default function useWeekPlan(meals) {
  const { uid, enabled, loading, plan, savePlan } = useUserData();

  const [weekPlan, setWeekPlan] = useState(() => loadLocalPlan().weekPlan);
  const [weekAddOns, setWeekAddOns] = useState(() => loadLocalPlan().weekAddOns);
  const [dismissedWarnings, setDismissedWarnings] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);

  const hydratedUid = useRef(null);
  const persistedRef = useRef(null);

  // The stored plan wins right after sign-in; local edits win from then on.
  useEffect(() => {
    if (!enabled) {
      // Signing out must not leave the previous account's plan on the device.
      if (hydratedUid.current) {
        hydratedUid.current = null;
        persistedRef.current = null;
        setWeekPlan({});
        setWeekAddOns({});
      }
      return;
    }
    if (!plan || hydratedUid.current === uid) return;
    hydratedUid.current = uid;

    const nextPlan = plan.weekPlan || {};
    const nextAddOns = plan.weekAddOns || {};
    const storedIsEmpty = !Object.keys(nextPlan).length && !Object.keys(nextAddOns).length;
    const localHasContent = Object.keys(weekPlan).length || Object.keys(weekAddOns).length;

    // Signing up mid-planning should carry the plan into the new account rather
    // than replacing it with an empty stored one.
    if (storedIsEmpty && localHasContent) return;

    persistedRef.current = JSON.stringify({ weekPlan: nextPlan, weekAddOns: nextAddOns });
    setWeekPlan(nextPlan);
    setWeekAddOns(nextAddOns);
  }, [enabled, uid, plan, weekPlan, weekAddOns]);

  useEffect(() => {
    const serialized = JSON.stringify({ weekPlan, weekAddOns });
    if (serialized === persistedRef.current) return undefined;

    if (!enabled) {
      persistedRef.current = serialized;
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, serialized);
      return undefined;
    }

    // Never write before the stored plan has been read, or an empty local state
    // would wipe the saved one.
    if (hydratedUid.current !== uid) return undefined;

    const timer = setTimeout(() => {
      persistedRef.current = serialized;
      savePlan(weekPlan, weekAddOns).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [weekPlan, weekAddOns, enabled, uid, savePlan]);

  // A recipe can disappear when the user deletes or hides it.
  useEffect(() => {
    // While the overlay is still arriving the user's own recipe ids are unknown,
    // so pruning would drop slots that are actually valid.
    if (enabled && (loading || hydratedUid.current !== uid)) return;
    const knownIds = new Set(meals.map((meal) => meal.id));
    setWeekPlan((prev) => pruneMissing(prev, knownIds));
    setWeekAddOns((prev) => pruneMissing(prev, knownIds));
  }, [meals, enabled, loading, uid]);

  const getMealsForSlot = (slot) => {
    const tag = SLOT_TAG_MAP[slot];
    return meals.filter(m => m.tags.includes(tag));
  };

  const getAddOns = () => meals.filter(m => m.tags.includes(ADDON_TAG));

  const setSlot = (day, slot, mealId) => {
    const key = cellKey(day, slot);
    setWeekPlan(prev => {
      const next = { ...prev };
      if (!mealId) {
        delete next[key];
        return next;
      }
      next[key] = mealId;
      const meal = meals.find(m => m.id === mealId);
      if (meal && meal.batchDays > 1) {
        const dayIdx = DAYS.indexOf(day);
        for (let i = 1; i < meal.batchDays; i++) {
          const nextDay = DAYS[dayIdx + i];
          if (nextDay) {
            const nextKey = cellKey(nextDay, slot);
            if (!next[nextKey]) {
              next[nextKey] = mealId;
            }
          }
        }
      }
      return next;
    });
    setOpenDropdown(null);
  };

  const setAddOn = (day, slot, addOnId) => {
    const key = cellKey(day, slot);
    setWeekAddOns(prev => {
      const next = { ...prev };
      if (!addOnId) delete next[key];
      else next[key] = addOnId;
      return next;
    });
    setOpenDropdown(null);
  };

  const clearAddOn = (day, slot) => {
    const key = cellKey(day, slot);
    setWeekAddOns(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const clearSlot = (day, slot) => {
    const key = cellKey(day, slot);
    setWeekPlan(prev => { const n = { ...prev }; delete n[key]; return n; });
    setWeekAddOns(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const clearAll = () => {
    setWeekPlan({});
    setWeekAddOns({});
    setDismissedWarnings({});
  };

  const getBatchWarnings = () => {
    const warnings = [];
    const counted = {};
    Object.entries(weekPlan).forEach(([key, mealId]) => {
      const slot = key.split("-").slice(1).join("-");
      const wKey = `${mealId}-${slot}`;
      counted[wKey] = (counted[wKey] || 0) + 1;
    });
    Object.entries(counted).forEach(([wKey, count]) => {
      const [mealId, slot] = [wKey.substring(0, wKey.lastIndexOf("-")), wKey.substring(wKey.lastIndexOf("-") + 1)];
      const meal = meals.find(m => m.id === mealId);
      if (meal && meal.batchDays > 1 && count !== meal.batchDays) {
        const dKey = `${wKey}-${count}`;
        if (!dismissedWarnings[dKey]) {
          warnings.push({ meal, count, expected: meal.batchDays, dismissKey: dKey, slot });
        }
      }
    });
    return warnings;
  };

  const dismissWarning = (dismissKey) => {
    setDismissedWarnings(prev => ({ ...prev, [dismissKey]: true }));
  };

  const getDayKBJU = (day) =>
    sumDayNutrition(day, weekPlan, weekAddOns, meals, cellKey, SLOTS);

  return {
    weekPlan, weekAddOns, cellKey,
    setSlot, clearSlot, clearAll,
    setAddOn, clearAddOn,
    getBatchWarnings, dismissWarning, getDayKBJU,
    openDropdown, setOpenDropdown,
    getMealsForSlot, getAddOns,
  };
}
