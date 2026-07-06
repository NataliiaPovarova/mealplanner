import { useTranslation } from "react-i18next";
import { ingredientCatalog } from "../constants";

const CATEGORY_ORDER = ["produce", "protein", "dairy", "legumes", "grains", "pantry"];

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

export default function useShoppingList(weekPlan, meals, weekAddOns = {}) {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const mealCounts = {};
  Object.values(weekPlan).forEach(mealId => {
    mealCounts[mealId] = (mealCounts[mealId] || 0) + 1;
  });
  Object.values(weekAddOns).forEach(addOnId => {
    mealCounts[addOnId] = (mealCounts[addOnId] || 0) + 1;
  });

  const batchCounts = {};
  Object.entries(mealCounts).forEach(([mealId, count]) => {
    const meal = meals.find(m => m.id === mealId);
    if (meal) batchCounts[mealId] = Math.ceil(count / meal.portions);
  });

  const map = {};
  Object.entries(batchCounts).forEach(([mealId, batches]) => {
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;
    meal.ingredients.forEach(ing => {
      if (ingredientCatalog[ing.id]?.shopping === false) return;
      const key = `${ing.id}|${ing.unit}`;
      const info = ingredientCatalog[ing.id];
      if (!map[key]) {
        map[key] = {
          ingredientId: ing.id,
          name: info?.[lang] || info?.ru || ing.id,
          amount: 0,
          unit: ing.unit,
          category: info?.category || "pantry",
        };
      }
      map[key].amount += (ing.amount || 0) * batches;
    });
  });

  const items = Object.values(map).map(item => {
    const { amount, unit } = normalizeAmount(item.amount, item.unit);
    return { ...item, amount, unit };
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
