import { useState } from "react";
import { DAYS, SLOTS, SLOT_TAG_MAP } from "../constants";

const cellKey = (day, slot) => `${day}-${slot}`;

export default function useWeekPlan(meals) {
  const [weekPlan, setWeekPlan] = useState({});
  const [dismissedWarnings, setDismissedWarnings] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);

  const getMealsForSlot = (slot) => {
    const tag = SLOT_TAG_MAP[slot];
    return meals.filter(m => m.tags.includes(tag));
  };

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

  const clearSlot = (day, slot) => {
    const key = cellKey(day, slot);
    setWeekPlan(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const clearAll = () => {
    setWeekPlan({});
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

  const getDayKBJU = (day) => {
    let kcal = 0, protein = 0, fiber = 0;
    SLOTS.forEach(slot => {
      const mealId = weekPlan[cellKey(day, slot)];
      if (mealId) {
        const meal = meals.find(m => m.id === mealId);
        if (meal) {
          kcal += meal.perPortion.kcal;
          protein += meal.perPortion.protein;
          fiber += meal.perPortion.fiber;
        }
      }
    });
    return { kcal, protein, fiber };
  };

  return {
    weekPlan, cellKey, setSlot, clearSlot, clearAll,
    getBatchWarnings, dismissWarning, getDayKBJU,
    openDropdown, setOpenDropdown, getMealsForSlot,
  };
}
