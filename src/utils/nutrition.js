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

/** Micros stored as whole numbers; the rest keep one decimal. */
export const WHOLE_NUMBER_MICROS = [
  "vitaminA", "vitaminD", "vitaminK", "vitaminB9", "vitaminB12",
];

export function emptyDayTotals() {
  const t = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, nutrients: {} };
  for (const k of MICRO_KEYS) t.nutrients[k] = 0;
  return t;
}

/** Rounds accumulated day totals and drops micros that stayed at zero. */
export function roundDayTotals(totals) {
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
        if (WHOLE_NUMBER_MICROS.includes(k)) return [k, Math.round(v)];
        return [k, Math.round(v * 10) / 10];
      }).filter(([, v]) => v > 0)
    ),
  };
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
