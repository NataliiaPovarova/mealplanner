import baseline from "virtual:nutrition-baseline";
import conversions from "../data/unit-conversions.json";
import { MACRO_KEYS, MICRO_KEYS } from "./nutrition";

/**
 * Browser port of scripts/recalculate-recipe-nutrition.mjs.
 *
 * The offline script stays the source of truth for the shipped recipes; this
 * module recalculates on the fly for recipes the user created or edited, and for
 * any recipe whose ingredients the user mapped to their own brand.
 */

const ALL_KEYS = [...MACRO_KEYS, ...MICRO_KEYS];
const WHOLE_NUMBER_MICROS = new Set([
  "vitaminA", "vitaminD", "vitaminK", "vitaminB9", "vitaminB12",
]);

/** `tahini-sauce-portion` borrows a portion from the `tahini-sauce` recipe. */
const REFERENCE_SUFFIX = "-portion";

export function referencedRecipeId(ingredientId) {
  return ingredientId.endsWith(REFERENCE_SUFFIX)
    ? ingredientId.slice(0, -REFERENCE_SUFFIX.length)
    : null;
}

function roundMacro(key, value) {
  if (value == null || Number.isNaN(value)) return 0;
  return key === "kcal" ? Math.round(value) : Math.round(value * 10) / 10;
}

function roundMicro(key, value) {
  if (value == null || Number.isNaN(value)) return null;
  if (WHOLE_NUMBER_MICROS.has(key)) return Math.round(value);
  return Math.round(value * 10) / 10;
}

function emptyTotals() {
  const totals = {};
  for (const key of ALL_KEYS) totals[key] = 0;
  return totals;
}

/**
 * Converts a recipe line to grams. Returns null when the amount cannot be
 * resolved, so the caller can warn instead of silently counting zero.
 */
export function gramsForIngredient({ id, amount, unit }) {
  if (id === "water") return 0; // rice-cooker scale marks; zero nutrition
  if (!(amount > 0)) return 0;

  if (unit === "g") return amount;
  if (unit === "kg") return amount * 1000;

  if (unit === "ml" || unit === "l") {
    const ml = unit === "l" ? amount * 1000 : amount;
    const density =
      conversions.densityGPerMl?.[id] ?? conversions.densityGPerMl?.default ?? 1;
    return ml * density;
  }

  // Culinary units resolve through the per-ingredient conversion table.
  const perUnit = conversions.ingredients?.[id]?.[unit];
  if (perUnit?.amount > 0) {
    return gramsForIngredient({ id, amount: amount * perUnit.amount, unit: perUnit.unit });
  }

  const volumeMl = conversions.volumeToMl?.[unit];
  if (volumeMl > 0) {
    return gramsForIngredient({ id, amount: amount * volumeMl, unit: "ml" });
  }

  return null;
}

/**
 * Nutrition per 100 g for one ingredient, with the user's brand layered on top.
 * Labels normally list macros only, so keys the user left blank keep the USDA
 * values instead of zeroing out the whole micronutrient profile.
 */
export function per100gFor(ingredientId, overrides = {}) {
  const base = baseline[ingredientId] || null;
  const override = overrides[ingredientId];
  if (!override) return base;

  const merged = { ...(base || {}) };
  for (const key of ALL_KEYS) {
    const value = override[key];
    if (value != null && value !== "" && !Number.isNaN(Number(value))) {
      merged[key] = Number(value);
    }
  }
  return merged;
}

function addScaled(totals, per100g, grams) {
  const factor = grams / 100;
  for (const key of ALL_KEYS) {
    const value = per100g[key];
    if (value == null) continue;
    totals[key] += value * factor;
  }
}

function addPortions(totals, perPortion, perPortionNutrients, count) {
  for (const key of MACRO_KEYS) totals[key] += (perPortion?.[key] ?? 0) * count;
  for (const key of MICRO_KEYS) {
    const value = perPortionNutrients?.[key];
    if (value != null) totals[key] += value * count;
  }
}

function finalize(totals, portions) {
  const divisor = portions > 0 ? portions : 1;
  const perPortion = {};
  for (const key of MACRO_KEYS) perPortion[key] = roundMacro(key, totals[key] / divisor);

  const perPortionNutrients = {};
  for (const key of MICRO_KEYS) {
    const rounded = roundMicro(key, totals[key] / divisor);
    if (rounded != null) perPortionNutrients[key] = rounded;
  }
  return { perPortion, perPortionNutrients };
}

/**
 * Nutrition for a single recipe. `resolveReference` returns already-computed
 * nutrition for a recipe borrowed through a `-portion` ingredient.
 */
export function computeRecipeNutrition(recipe, { overrides = {}, resolveReference } = {}) {
  const totals = emptyTotals();
  const warnings = [];

  for (const ing of recipe.ingredients || []) {
    const referenceId = referencedRecipeId(ing.id);
    if (referenceId) {
      const reference = resolveReference?.(referenceId);
      if (!reference) {
        warnings.push({ ingredientId: ing.id, reason: "missingReference" });
        continue;
      }
      addPortions(totals, reference.perPortion, reference.perPortionNutrients, ing.amount || 1);
      continue;
    }

    if (ing.id === "water") continue;

    const grams = gramsForIngredient(ing);
    if (grams == null) {
      warnings.push({ ingredientId: ing.id, reason: "unknownUnit" });
      continue;
    }

    const per100g = per100gFor(ing.id, overrides);
    if (!per100g) {
      warnings.push({ ingredientId: ing.id, reason: "noNutritionData" });
      continue;
    }
    addScaled(totals, per100g, grams);
  }

  return { ...finalize(totals, recipe.portions), warnings };
}

/**
 * Recalculates the recipes that need it and leaves the rest untouched, so the
 * shipped catalog keeps its offline-computed values byte for byte.
 *
 * A recipe is recalculated when it carries `needsNutritionRecompute` (user
 * recipe or edited base recipe), when it uses an ingredient the user mapped to
 * their own brand, or when it borrows a portion from a recipe in either group.
 */
export function applyNutrition(recipes, overrides = {}) {
  const hasOverrides = Object.keys(overrides).length > 0;
  const dirty = new Set();

  for (const recipe of recipes) {
    const usesOverriddenIngredient =
      hasOverrides && recipe.ingredients?.some((ing) => overrides[ing.id]);
    if (recipe.needsNutritionRecompute || usesOverriddenIngredient) dirty.add(recipe.id);
  }

  // Borrowing a portion from a recalculated recipe makes the borrower stale too.
  for (let changed = true; changed;) {
    changed = false;
    for (const recipe of recipes) {
      if (dirty.has(recipe.id)) continue;
      const dependsOnDirty = recipe.ingredients?.some((ing) => {
        const referenceId = referencedRecipeId(ing.id);
        return referenceId && dirty.has(referenceId);
      });
      if (dependsOnDirty) {
        dirty.add(recipe.id);
        changed = true;
      }
    }
  }

  if (dirty.size === 0) return recipes;

  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const cache = new Map();
  const visiting = new Set();

  const shipped = (recipe) => ({
    perPortion: recipe.perPortion,
    perPortionNutrients: recipe.perPortionNutrients,
  });

  function nutritionFor(id) {
    const recipe = byId.get(id);
    if (!recipe) return null;
    if (!dirty.has(id)) return shipped(recipe);
    if (cache.has(id)) return cache.get(id);
    // Recipes referencing each other in a loop fall back to stored values.
    if (visiting.has(id)) return shipped(recipe);

    visiting.add(id);
    const result = computeRecipeNutrition(recipe, {
      overrides,
      resolveReference: nutritionFor,
    });
    visiting.delete(id);
    cache.set(id, result);
    return result;
  }

  return recipes.map((recipe) => {
    if (!dirty.has(recipe.id)) return recipe;
    const { perPortion, perPortionNutrients } = nutritionFor(recipe.id);
    return { ...recipe, perPortion, perPortionNutrients, nutritionRecomputed: true };
  });
}
