import { useTranslation } from "react-i18next";
import { INGREDIENT_CATEGORIES, ingredientCatalog } from "../constants";
import { KIND_INGREDIENT, forEachPlanEntry, mealsById } from "../utils/planEntries";
import { resolveShoppingMeasure } from "../utils/shoppingMeasure";

const CATEGORY_ORDER = INGREDIENT_CATEGORIES;

const UNIT_CONVERSIONS = {
  g:  { threshold: 1000, target: "kg",  factor: 0.001 },
  ml: { threshold: 1000, target: "l",   factor: 0.001 },
};

function normalizeAmount(amount, unit) {
  const conv = UNIT_CONVERSIONS[unit];
  if (conv && amount >= conv.threshold) {
    return { amount: +(amount * conv.factor).toFixed(2), unit: conv.target };
  }
  return { amount, unit };
}

/**
 * Recipes are bought by the number of preparations, ingredients planned as a dish
 * or an add-on by their own amount; both land in the same line per ingredient.
 */
export default function useShoppingList(weekPlan, meals) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const byId = mealsById(meals);

  const portionsByRecipe = {};
  const plannedIngredients = {};

  forEachPlanEntry(weekPlan, (entry) => {
    if (entry.kind === KIND_INGREDIENT) {
      if (ingredientCatalog[entry.id]?.shopping === false) return;
      const key = `${entry.id}|${entry.unit}`;
      if (!plannedIngredients[key]) {
        plannedIngredients[key] = { id: entry.id, unit: entry.unit, amount: 0, uses: 0 };
      }
      plannedIngredients[key].amount += entry.amount || 0;
      plannedIngredients[key].uses += 1;
      return;
    }
    const portions = entry.amount > 0 ? entry.amount : 1;
    portionsByRecipe[entry.id] = (portionsByRecipe[entry.id] || 0) + portions;
  });

  const map = {};
  const usesById = {};

  const lineFor = (ingredientId, unit) => {
    const key = `${ingredientId}|${unit}`;
    if (!map[key]) {
      const info = ingredientCatalog[ingredientId];
      map[key] = {
        ingredientId,
        name: info?.[lang] || info?.ru || ingredientId,
        amount: 0,
        unit,
        category: info?.category || "pantry",
      };
    }
    return map[key];
  };

  Object.entries(portionsByRecipe).forEach(([mealId, portions]) => {
    const meal = byId.get(mealId);
    if (!meal) return;
    const batches = Math.ceil(portions / meal.portions);
    const countedInMeal = new Set();
    meal.ingredients.forEach((ing) => {
      if (ingredientCatalog[ing.id]?.shopping === false) return;
      lineFor(ing.id, ing.unit).amount += (ing.amount || 0) * batches;
      if (!countedInMeal.has(ing.id)) {
        countedInMeal.add(ing.id);
        usesById[ing.id] = (usesById[ing.id] || 0) + batches;
      }
    });
  });

  Object.values(plannedIngredients).forEach(({ id, unit, amount, uses }) => {
    lineFor(id, unit).amount += amount;
    usesById[id] = (usesById[id] || 0) + uses;
  });

  const items = Object.values(map).map(item => {
    const measure = resolveShoppingMeasure({
      ingredientId: item.ingredientId,
      amount: item.amount,
      unit: item.unit,
      uses: usesById[item.ingredientId] || 0,
    });
    const { amount, unit } = normalizeAmount(item.amount, item.unit);
    return { ...item, amount, unit, measure };
  });

  const grouped = {};
  items.forEach(item => {
    const cat = item.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  Object.values(grouped).forEach(items =>
    items.sort((a, b) => a.name.localeCompare(b.name, lang))
  );

  const sortedCategories = CATEGORY_ORDER.filter(c => grouped[c]);

  return { grouped, sortedCategories };
}
