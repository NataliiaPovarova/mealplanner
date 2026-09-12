import { ingredientCatalog, ingredientName } from "../constants";
import { gramsForIngredient, per100gFor } from "./computeNutrition";
import { MACRO_KEYS, MICRO_KEYS, emptyDayTotals, roundDayTotals } from "./nutrition";
import { knownMeasureUnits, measureIn, measureUnitLabel } from "./shoppingMeasure";

/**
 * A slot of the week plan holds a list of dishes. A dish is either a recipe or a
 * single catalog ingredient with an amount, and carries its own add-ons:
 *
 *   weekPlan["mon-lunch"] = [
 *     { key, kind: "recipe", id, addOns: [{ key, kind: "recipe", id, amount }] },
 *     { key, kind: "ingredient", id, amount, unit, addOns: [...] },
 *   ]
 *
 * Everything that reads the plan — daily nutrition, the shopping list, the PDF —
 * goes through the helpers here, so the shape is described in exactly one place.
 */

export const PLAN_VERSION = 2;

export const KIND_RECIPE = "recipe";
export const KIND_INGREDIENT = "ingredient";

export const ROLE_DISH = "dish";
export const ROLE_ADDON = "addon";

/** Fallback amount for an ingredient the catalog has no default portion for. */
const FALLBACK_PORTION = { amount: 100, unit: "g" };

let keyCounter = 0;

export function newEntryKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  keyCounter += 1;
  return `e${Date.now().toString(36)}-${keyCounter}`;
}

export function ingredientRoles(id) {
  return ingredientCatalog[id]?.roles || [];
}

export function ingredientHasRole(id, role) {
  return ingredientRoles(id).includes(role);
}

export function ingredientTags(id) {
  return ingredientCatalog[id]?.tags || [];
}

/** Default amount for one serving of an ingredient in the given role. */
export function defaultPortionFor(id, role = ROLE_DISH) {
  const portion = ingredientCatalog[id]?.portion;
  if (!portion) return null;
  const amount = portion[role] ?? portion[ROLE_DISH] ?? portion[ROLE_ADDON];
  return amount > 0 ? { amount, unit: portion.unit || "g" } : null;
}

export function makeDish({ kind, id, role = ROLE_DISH, amount, unit }) {
  return { ...makeAddOn({ kind, id, role, amount, unit }), addOns: [] };
}

export function makeAddOn({ kind, id, role = ROLE_ADDON, amount, unit }) {
  const entry = { key: newEntryKey(), kind, id };
  if (kind === KIND_INGREDIENT) {
    const portion = defaultPortionFor(id, role) || FALLBACK_PORTION;
    entry.amount = amount ?? portion.amount;
    entry.unit = unit || portion.unit;
  } else if (amount > 0) {
    entry.amount = amount;
  }
  return entry;
}

function normalizeEntry(raw, { nested }) {
  if (!raw?.id) return null;
  const kind = raw.kind === KIND_INGREDIENT ? KIND_INGREDIENT : KIND_RECIPE;
  const entry = { key: raw.key || newEntryKey(), kind, id: raw.id };
  if (kind === KIND_INGREDIENT) {
    const portion = defaultPortionFor(raw.id, nested ? ROLE_ADDON : ROLE_DISH) || FALLBACK_PORTION;
    entry.amount = raw.amount > 0 ? raw.amount : portion.amount;
    entry.unit = raw.unit || portion.unit;
  } else if (raw.amount > 0 && raw.amount !== 1) {
    entry.amount = raw.amount;
  }
  if (!nested) {
    entry.addOns = (Array.isArray(raw.addOns) ? raw.addOns : [])
      .map((addOn) => normalizeEntry(addOn, { nested: true }))
      .filter(Boolean);
  }
  return entry;
}

/** One recipe per slot plus a parallel add-on map — the shape shipped before v2. */
export function migrateLegacyPlan(legacyPlan = {}, legacyAddOns = {}) {
  const migrated = {};
  for (const [cell, mealId] of Object.entries(legacyPlan)) {
    if (typeof mealId !== "string" || !mealId) continue;
    const dish = makeDish({ kind: KIND_RECIPE, id: mealId });
    const addOnId = legacyAddOns[cell];
    if (typeof addOnId === "string" && addOnId) {
      dish.addOns.push(makeAddOn({ kind: KIND_RECIPE, id: addOnId }));
    }
    migrated[cell] = [dish];
  }
  return migrated;
}

/**
 * Accepts either plan shape — stored v2 lists or the legacy string-per-slot map —
 * and always returns v2. Empty slots are dropped so a filled-slot count stays honest.
 */
export function normalizeWeekPlan(weekPlan, weekAddOns) {
  const cells = Object.entries(weekPlan || {});
  if (cells.some(([, value]) => typeof value === "string")) {
    return migrateLegacyPlan(weekPlan, weekAddOns);
  }

  const normalized = {};
  for (const [cell, dishes] of cells) {
    const list = (Array.isArray(dishes) ? dishes : [])
      .map((dish) => normalizeEntry(dish, { nested: false }))
      .filter(Boolean);
    if (list.length) normalized[cell] = list;
  }
  return normalized;
}

export function dishesInSlot(weekPlan, cell) {
  const dishes = weekPlan?.[cell];
  return Array.isArray(dishes) ? dishes : [];
}

/** Walks every dish and add-on of the plan; `cell` is the `day-slot` key. */
export function forEachPlanEntry(weekPlan, callback) {
  for (const [cell, dishes] of Object.entries(weekPlan || {})) {
    for (const dish of Array.isArray(dishes) ? dishes : []) {
      callback(dish, cell, null);
      for (const addOn of dish.addOns || []) callback(addOn, cell, dish);
    }
  }
}

export function countPlannedDishes(weekPlan) {
  let count = 0;
  for (const dishes of Object.values(weekPlan || {})) {
    count += Array.isArray(dishes) ? dishes.length : 0;
  }
  return count;
}

export function mealsById(meals) {
  return new Map((meals || []).map((meal) => [meal.id, meal]));
}

/** A product planned as a dish deserves an icon too, picked from its food tag. */
const INGREDIENT_EMOJI = {
  grain: "🍚", pasta: "🍝", bread: "🍞", meat: "🍗", fish: "🐟", egg: "🥚",
  legume: "🫘", dairy: "🥛", cheese: "🧀", veg: "🥗", fruit: "🍓",
  "nuts-seeds": "🥜", sauce: "🫗", sweet: "🍯",
};

export function ingredientEmoji(id) {
  for (const tag of ingredientTags(id)) {
    if (INGREDIENT_EMOJI[tag]) return INGREDIENT_EMOJI[tag];
  }
  return "🥄";
}

/**
 * Macros and micros contributed by one entry, unrounded so callers can sum first.
 * Recipes contribute `amount` portions (one by default); ingredients are scaled
 * from their per-100 g baseline, with the user's brand layered on when present.
 */
export function entryNutrition(entry, { byId, overrides = {} }) {
  if (!entry?.id) return null;

  if (entry.kind === KIND_INGREDIENT) {
    const grams = gramsForIngredient({ id: entry.id, amount: entry.amount, unit: entry.unit });
    if (grams == null) return null;
    const per100g = per100gFor(entry.id, overrides);
    if (!per100g) return null;

    const factor = grams / 100;
    const macros = {};
    for (const key of MACRO_KEYS) macros[key] = (per100g[key] || 0) * factor;
    const micros = {};
    for (const key of MICRO_KEYS) {
      if (per100g[key] != null) micros[key] = per100g[key] * factor;
    }
    return { perPortion: macros, perPortionNutrients: micros };
  }

  const meal = byId?.get(entry.id);
  if (!meal) return null;
  const portions = entry.amount > 0 ? entry.amount : 1;
  const macros = {};
  for (const key of MACRO_KEYS) macros[key] = (meal.perPortion?.[key] || 0) * portions;
  const micros = {};
  for (const key of MICRO_KEYS) {
    const value = meal.perPortionNutrients?.[key];
    if (value != null) micros[key] = value * portions;
  }
  return { perPortion: macros, perPortionNutrients: micros };
}

export function entryKcal(entry, context) {
  const nutrition = entryNutrition(entry, context);
  return nutrition ? Math.round(nutrition.perPortion.kcal) : null;
}

function addEntryToTotals(totals, entry, context) {
  const nutrition = entryNutrition(entry, context);
  if (!nutrition) return;
  for (const key of MACRO_KEYS) totals[key] += nutrition.perPortion[key] || 0;
  for (const key of MICRO_KEYS) {
    const value = nutrition.perPortionNutrients[key];
    if (value != null) totals.nutrients[key] += value;
  }
}

/** Macros + micros of one day, dishes and their add-ons together. */
export function sumDayNutrition(day, weekPlan, { byId, meals, overrides = {}, cellKey, slots }) {
  const context = { byId: byId || mealsById(meals), overrides };
  const totals = emptyDayTotals();
  for (const slot of slots) {
    for (const dish of dishesInSlot(weekPlan, cellKey(day, slot))) {
      addEntryToTotals(totals, dish, context);
      for (const addOn of dish.addOns || []) addEntryToTotals(totals, addOn, context);
    }
  }
  return roundDayTotals(totals);
}

export function entryName(entry, { byId, lang }) {
  if (!entry?.id) return "";
  return entry.kind === KIND_INGREDIENT
    ? ingredientName(entry.id, lang)
    : byId?.get(entry.id)?.name || entry.id;
}

export function entryEmoji(entry, { byId }) {
  if (entry?.kind === KIND_INGREDIENT) return ingredientEmoji(entry.id);
  return byId?.get(entry?.id)?.emoji || "🍽️";
}

/** "150 г" for an ingredient dish; recipes show their portion count instead. */
export function entryAmountLabel(entry, t) {
  if (entry?.kind !== KIND_INGREDIENT) return null;
  return `${entry.amount} ${t(`units.${entry.unit}`, { defaultValue: entry.unit })}`;
}

/**
 * "≈ 2 ст. л." for an amount in grams or millilitres, so a default portion is
 * something the user can picture. Null when the conversion table has no measure.
 */
export function householdHint(entry, t, language) {
  if (entry?.kind !== KIND_INGREDIENT || !(entry.amount > 0)) return null;

  let halfMeasure = null;
  for (const measureUnit of knownMeasureUnits(entry.id)) {
    const measure = measureIn(entry.id, entry.amount, entry.unit, measureUnit);
    if (!measure) continue;
    // A whole spoon reads better than half of a bigger one, so keep looking.
    if (measure.amount >= 1) return formatHint(measure, t, language);
    if (measure.amount >= 0.5 && !halfMeasure) halfMeasure = measure;
  }
  return halfMeasure ? formatHint(halfMeasure, t, language) : null;
}

function formatHint(measure, t, language) {
  return `≈ ${measure.amount} ${measureUnitLabel(measure.unit, measure.amount, t, language)}`;
}
