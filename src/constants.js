import ingredientData from "./data/ingredients.json";
import tagVocabulary from "./data/tags.json";

/** Both data files carry a leading `_comment`; strip it so callers can iterate freely. */
const withoutComments = (data) =>
  Object.fromEntries(Object.entries(data).filter(([id]) => !id.startsWith("_")));

export const ingredientCatalog = withoutComments(ingredientData);

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
  const info = ingredientCatalog[ing.id];
  const name = info?.[lang] || info?.ru || ing.id;
  const unitLabel = t(`units.${ing.unit}`, { defaultValue: ing.unit });
  let result = name;
  if (ing.amount) result += ` — ${ing.amount} ${unitLabel}`;
  if (ing.note) result += ` (${ing.note})`;
  else if (ing.optional) result += ` (${t("recipe.optional")})`;
  return result;
}

export function ingredientName(id, lang) {
  const info = ingredientCatalog[id];
  return info?.[lang] || info?.ru || id;
}
