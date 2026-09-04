/**
 * The shipped catalog stays read-only. Personal changes live in Firestore as an
 * overlay of three document shapes:
 *
 *   { baseId: null, ... }             own recipe
 *   { baseId: "<id>", ... }           edited shipped recipe
 *   { baseId: "<id>", deleted: true } shipped recipe hidden for this user
 *
 * Structural fields are stored once because they are language independent;
 * only prose is kept per language, which preserves the ru.json/en.json
 * invariant that amounts and portions stay in sync between locales.
 */

export const STRUCTURAL_FIELDS = [
  "emoji", "type", "tags", "batchDays", "portions",
  "prepMinutes", "cookMinutes", "ingredients",
];

export const TEXT_FIELDS = ["name", "description", "steps", "tips", "freshAdd"];

export const LANGS = ["ru", "en"];

export function formatMinutes(minutes, t) {
  return minutes > 0 ? `${minutes} ${t("units.min")}` : "—";
}

function textForLang(text, lang) {
  if (!text) return {};
  const preferred = text[lang];
  if (preferred && preferred.name) return preferred;
  // A recipe written in one language should still be usable in the other.
  for (const fallback of LANGS) {
    if (text[fallback]?.name) return text[fallback];
  }
  return preferred || {};
}

function applyText(target, text, lang) {
  const resolved = textForLang(text, lang);
  for (const field of TEXT_FIELDS) {
    if (resolved[field] != null) target[field] = resolved[field];
  }
}

function applyStructure(target, source) {
  for (const field of STRUCTURAL_FIELDS) {
    if (source[field] != null) target[field] = source[field];
  }
}

function withTimeLabels(recipe, t) {
  if (recipe.prepMinutes != null) recipe.prepTime = formatMinutes(recipe.prepMinutes, t);
  if (recipe.cookMinutes != null) recipe.cookTime = formatMinutes(recipe.cookMinutes, t);
  return recipe;
}

function fromOwnRecipe(overlayDoc, lang, t) {
  const recipe = {
    id: overlayDoc.id,
    emoji: "🍽️",
    type: "custom",
    tags: [],
    batchDays: 1,
    portions: 1,
    // Kept non-null so prepTime/cookTime always render, including in the PDF.
    prepMinutes: 0,
    cookMinutes: 0,
    ingredients: [],
    steps: [],
    name: overlayDoc.id,
    description: "",
    tips: "",
    perPortion: { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
    perPortionNutrients: {},
  };
  applyStructure(recipe, overlayDoc);
  applyText(recipe, overlayDoc.text, lang);
  recipe.isUserRecipe = true;
  recipe.needsNutritionRecompute = true;
  return withTimeLabels(recipe, t);
}

function fromOverriddenRecipe(baseRecipe, overlayDoc, lang, t) {
  const recipe = { ...baseRecipe };
  applyStructure(recipe, overlayDoc);
  applyText(recipe, overlayDoc.text, lang);
  recipe.isEditedBaseRecipe = true;
  // The overlay may have changed amounts or portions, so never trust the
  // shipped totals for an edited recipe.
  recipe.needsNutritionRecompute = true;
  return withTimeLabels(recipe, t);
}

/** Merges the shipped catalog with one user's overlay documents. */
export function mergeRecipeOverlay(baseRecipes, overlayDocs, lang, t) {
  if (!overlayDocs?.length) return baseRecipes;

  const overridesByBaseId = new Map();
  const ownDocs = [];
  for (const overlayDoc of overlayDocs) {
    if (overlayDoc.baseId) overridesByBaseId.set(overlayDoc.baseId, overlayDoc);
    else ownDocs.push(overlayDoc);
  }

  const merged = [];
  for (const baseRecipe of baseRecipes) {
    const override = overridesByBaseId.get(baseRecipe.id);
    if (!override) {
      merged.push(baseRecipe);
    } else if (!override.deleted) {
      merged.push(fromOverriddenRecipe(baseRecipe, override, lang, t));
    }
  }
  for (const ownDoc of ownDocs) {
    merged.push(fromOwnRecipe(ownDoc, lang, t));
  }
  return merged;
}

/** ingredientId -> per100g of the brand the user picked for that ingredient. */
export function brandOverridesFor(products, ingredientDefaults) {
  const entries = Object.entries(ingredientDefaults || {});
  if (!entries.length) return {};

  const productsById = new Map((products || []).map((product) => [product.id, product]));
  const overrides = {};
  for (const [ingredientId, productId] of entries) {
    const product = productsById.get(productId);
    if (product?.per100g) overrides[ingredientId] = product.per100g;
  }
  return overrides;
}
