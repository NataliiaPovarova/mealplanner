import ingredientData from "./data/ingredients.json";
import tagVocabulary from "./data/tags.json";

/** Both data files carry a leading `_comment`; strip it so callers can iterate freely. */
const withoutComments = (data) =>
  Object.fromEntries(Object.entries(data).filter(([id]) => !id.startsWith("_")));

/**
 * The shipped catalog plus the signed-in user's own ingredients, merged in place.
 *
 * The catalog is read from a dozen places that are not React components — the
 * plan helpers, the shopping list, the PDF writers — so handing them a merged
 * copy would mean an extra argument on every function in those chains. Instead
 * `setUserIngredients` swaps the `my:` keys and keeps the object identity, and
 * the provider calls it before it publishes the matching state, so no render
 * ever sees a plan entry whose ingredient the catalog cannot resolve.
 */
export const ingredientCatalog = withoutComments(ingredientData);

/** Shopping-list groups; also the choice a user has when adding an ingredient. */
export const INGREDIENT_CATEGORIES = ["produce", "protein", "dairy", "legumes", "grains", "pantry"];

/** Units the nutrition engine converts for an ingredient it has no measures for. */
export const INGREDIENT_UNITS = ["g", "ml"];

/** Personal ids are prefixed, so they can never collide with the shipped catalog. */
export const CUSTOM_INGREDIENT_PREFIX = "my:";

export const isCustomIngredient = (id) => String(id || "").startsWith(CUSTOM_INGREDIENT_PREFIX);

export function newCustomIngredientId() {
  return `${CUSTOM_INGREDIENT_PREFIX}${crypto.randomUUID()}`;
}

/** Replaces every `my:` entry with the given documents; `[]` clears them on sign-out. */
export function setUserIngredients(docs) {
  for (const id of Object.keys(ingredientCatalog)) {
    if (isCustomIngredient(id)) delete ingredientCatalog[id];
  }
  for (const doc of docs || []) {
    if (doc?.id) ingredientCatalog[doc.id] = doc;
  }
}

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const SLOTS = ["breakfast", "lunch", "dinner", "snack"];
export const ADDON_TAG = "add-on";

/** Group of a user-defined tag; the vocabulary in tags.json never uses it. */
export const CUSTOM_TAG_GROUP = "custom";

/** Display order of the filter bar. Personal tags come first because they answer
 * "what do I eat for breakfast", which the shipped vocabulary deliberately does not. */
export const TAG_GROUPS = [CUSTOM_TAG_GROUP, "food", "form", "effort", "diet"];

/** Groups shown collapsed-by-default in the picker: enough to narrow a long list. */
export const PICKER_TAG_GROUPS = [CUSTOM_TAG_GROUP, "food", "form"];

export const tagCatalog = withoutComments(tagVocabulary);

export function tagGroup(tagId) {
  return tagCatalog[tagId]?.group || CUSTOM_TAG_GROUP;
}

/** Tag ids of one group, in vocabulary order. */
export function tagsInGroup(group) {
  return Object.keys(tagCatalog).filter((id) => tagCatalog[id].group === group);
}

/**
 * Splits tag ids into `[{ group, tags }]` following TAG_GROUPS, so both the
 * recipe list and the dish picker render the same headings in the same order.
 */
export function groupTags(tagIds, { groups = TAG_GROUPS } = {}) {
  const seen = new Set(tagIds);
  return groups
    .map((group) => ({
      group,
      tags: group === CUSTOM_TAG_GROUP
        ? tagIds.filter((id) => !tagCatalog[id])
        : tagsInGroup(group).filter((id) => seen.has(id)),
    }))
    .filter((entry) => entry.tags.length > 0);
}

export function formatIngredient(ing, t, lang) {
  const unitLabel = t(`units.${ing.unit}`, { defaultValue: ing.unit });
  let result = ingredientName(ing.id, lang);
  if (ing.amount) result += ` — ${ing.amount} ${unitLabel}`;
  if (ing.note) result += ` (${ing.note})`;
  else if (ing.optional) result += ` (${t("recipe.optional")})`;
  return result;
}

/**
 * Shipped ingredients are always bilingual; a user-created one may be named in
 * one language only, so the fallback walks both before giving up on the id.
 */
export function ingredientName(id, lang) {
  const info = ingredientCatalog[id];
  return info?.[lang] || info?.ru || info?.en || id;
}
