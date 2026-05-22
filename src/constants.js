import ingredientCatalog from "./data/ingredients.json";

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const SLOTS = ["breakfast", "lunch", "dinner", "snack"];
export const SLOT_TAG_MAP = { breakfast: "breakfast-dinner", lunch: "lunch", dinner: "breakfast-dinner", snack: "snack" };

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

export { ingredientCatalog };
