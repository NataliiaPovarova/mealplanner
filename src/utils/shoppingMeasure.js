import conversions from "../data/unit-conversions.json";

const BULK_BY_WEIGHT = new Set(conversions.bulkByWeight || []);
const USES_MEASURE_UNIT = "pcs";
const SMALLER_UNIT = { tbsp: "tsp" };

function convertAmount(amount, fromUnit, toUnit, ingredientId) {
  if (fromUnit === toUnit) return amount;
  const density =
    conversions.densityGPerMl?.[ingredientId] ?? conversions.densityGPerMl?.default ?? 1;
  if (fromUnit === "g" && toUnit === "ml") return amount / density;
  if (fromUnit === "ml" && toUnit === "g") return amount * density;
  return null;
}

function roundCount(count) {
  if (count >= 10) return Math.round(count);
  const halves = Math.round(count * 2) / 2;
  return halves > 0 ? halves : 0.5;
}

function measureIn(ingredientId, amount, unit, measureUnit) {
  const perUnit = conversions.ingredients?.[ingredientId]?.[measureUnit];
  if (!(perUnit?.amount > 0)) return null;
  const converted = convertAmount(amount, unit, perUnit.unit, ingredientId);
  if (converted == null) return null;
  return { amount: roundCount(converted / perUnit.amount), unit: measureUnit };
}

/**
 * Picks the household measure shown first in the shopping list.
 * Preferred unit comes from the recipe conversion table; ingredients without one
 * fall back to how many times they are used across the week, and goods bought
 * by weight keep grams only.
 */
export function resolveShoppingMeasure({ ingredientId, amount, unit, uses = 0 }) {
  if (!(amount > 0)) return null;

  const preferredUnit = conversions.shoppingUnits?.[ingredientId];
  if (preferredUnit) {
    let measure = measureIn(ingredientId, amount, unit, preferredUnit);
    if (measure && measure.amount < 1 && SMALLER_UNIT[preferredUnit]) {
      const smaller = measureIn(ingredientId, amount, unit, SMALLER_UNIT[preferredUnit]);
      if (smaller && smaller.amount >= 1) measure = smaller;
    }
    if (measure) return measure;
  }

  if (BULK_BY_WEIGHT.has(ingredientId) || uses <= 0) return null;
  return { amount: uses, unit: USES_MEASURE_UNIT, fromUses: true };
}

export function measureUnitLabel(unit, count, t, language) {
  const locale = String(language || "ru").startsWith("ru") ? "ru" : "en";
  const category = new Intl.PluralRules(locale).select(count);
  return t(`measure.${unit}_${category}`, {
    defaultValue: t(`measure.${unit}_other`, {
      defaultValue: t(`units.${unit}`, { defaultValue: unit }),
    }),
  });
}

export function formatShoppingAmount(item, t, language) {
  if (!(item.amount > 0)) return "—";
  const metric = `${item.amount} ${t(`units.${item.unit}`, { defaultValue: item.unit })}`;
  if (!item.measure) return metric;
  const label = measureUnitLabel(item.measure.unit, item.measure.amount, t, language);
  return `${item.measure.amount} ${label} (${metric})`;
}
