/** Keys stored on recipe.perPortion */
export const MACRO_KEYS = ["kcal", "protein", "fat", "carbs", "fiber"];

/** Keys stored on recipe.perPortionNutrients */
export const MICRO_KEYS = [
  "sugar",
  "sodium",
  "calcium",
  "iron",
  "potassium",
  "magnesium",
  "zinc",
  "vitaminA",
  "vitaminC",
  "vitaminD",
  "vitaminE",
  "vitaminK",
  "vitaminB1",
  "vitaminB2",
  "vitaminB3",
  "vitaminB5",
  "vitaminB6",
  "vitaminB9",
  "vitaminB12",
];

/** Display unit for each nutrient (for i18n units.*) */
export const NUTRIENT_UNITS = {
  kcal: "kcal",
  protein: "g",
  fat: "g",
  carbs: "g",
  fiber: "g",
  sugar: "g",
  sodium: "mg",
  calcium: "mg",
  iron: "mg",
  potassium: "mg",
  magnesium: "mg",
  zinc: "mg",
  vitaminA: "ug",
  vitaminC: "mg",
  vitaminD: "ug",
  vitaminE: "mg",
  vitaminK: "ug",
  vitaminB1: "mg",
  vitaminB2: "mg",
  vitaminB3: "mg",
  vitaminB5: "mg",
  vitaminB6: "mg",
  vitaminB9: "ug",
  vitaminB12: "ug",
};

function emptyDayTotals() {
  const t = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, nutrients: {} };
  for (const k of MICRO_KEYS) t.nutrients[k] = 0;
  return t;
}

function addRecipeToTotals(totals, recipe) {
  if (!recipe?.perPortion) return;
  const p = recipe.perPortion;
  totals.kcal += p.kcal || 0;
  totals.protein += p.protein || 0;
  totals.fat += p.fat || 0;
  totals.carbs += p.carbs || 0;
  totals.fiber += p.fiber || 0;
  const n = recipe.perPortionNutrients || {};
  for (const k of MICRO_KEYS) {
    if (n[k] != null) totals.nutrients[k] += n[k];
  }
}

function roundDay(totals) {
  return {
    kcal: Math.round(totals.kcal),
    protein: Math.round(totals.protein * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
    nutrients: Object.fromEntries(
      MICRO_KEYS.map((k) => {
        const v = totals.nutrients[k];
        if (!v) return [k, 0];
        if (
          ["vitaminA", "vitaminD", "vitaminK", "vitaminB9", "vitaminB12"].includes(k)
        ) {
          return [k, Math.round(v)];
        }
        return [k, Math.round(v * 10) / 10];
      }).filter(([, v]) => v > 0)
    ),
  };
}

/**
 * Sum macros + micros for one day from week plan + add-ons.
 */
export function sumDayNutrition(day, weekPlan, weekAddOns, meals, cellKey, slots) {
  const totals = emptyDayTotals();
  for (const slot of slots) {
    const key = cellKey(day, slot);
    const mealId = weekPlan[key];
    if (mealId) {
      const meal = meals.find((m) => m.id === mealId);
      addRecipeToTotals(totals, meal);
    }
    const addOnId = weekAddOns[key];
    if (addOnId) {
      const addOn = meals.find((m) => m.id === addOnId);
      addRecipeToTotals(totals, addOn);
    }
  }
  return roundDay(totals);
}

/** Known micro nutrients with non-null/non-zero values from a recipe */
export function knownMicros(recipe) {
  const n = recipe?.perPortionNutrients || {};
  return MICRO_KEYS.filter((k) => n[k] != null && n[k] !== 0).map((k) => ({
    key: k,
    value: n[k],
    unit: NUTRIENT_UNITS[k],
  }));
}

export function formatNutrientValue(value, unitKey, t) {
  const unit = t(`units.${unitKey}`, { defaultValue: unitKey });
  return `${value}${unit}`;
}
