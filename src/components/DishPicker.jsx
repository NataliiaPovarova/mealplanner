import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ADDON_TAG,
  PICKER_TAG_GROUPS,
  TAG_GROUPS,
  ingredientCatalog,
  ingredientName,
} from "../constants";
import { useUserData } from "../contexts/UserDataContext";
import { isCustomTag } from "../hooks/useDishTags";
import {
  KIND_INGREDIENT,
  KIND_RECIPE,
  ROLE_ADDON,
  ROLE_DISH,
  defaultPortionFor,
  entryKcal,
  householdHint,
  ingredientEmoji,
  ingredientHasRole,
  ingredientTags,
} from "../utils/planEntries";
import CustomIngredientForm from "./CustomIngredientForm";
import DishTagChips from "./DishTagChips";
import TagFilterBar, { tagChipStyle } from "./TagFilterBar";
import { Overlay, inputStyle } from "./ui";

const SOURCE_RECIPES = "recipes";
const SOURCE_INGREDIENTS = "ingredients";

const memoKey = (role, slot) => `dish-filter:${role}:${slot}`;

/** Filters are per slot and per role: breakfast and dinner are searched differently. */
function loadFilterMemo(role, slot, fallbackSource) {
  if (typeof localStorage === "undefined") return { source: fallbackSource, tags: [] };
  try {
    const stored = JSON.parse(localStorage.getItem(memoKey(role, slot)) || "null");
    return {
      source: stored?.source === SOURCE_INGREDIENTS || stored?.source === SOURCE_RECIPES
        ? stored.source
        : fallbackSource,
      tags: Array.isArray(stored?.tags) ? stored.tags : [],
    };
  } catch {
    return { source: fallbackSource, tags: [] };
  }
}

function SegmentedControl({ value, options, onChange }) {
  return (
    <div style={{
      display: "flex", borderRadius: 8, overflow: "hidden",
      border: "1px solid var(--border-color, #d5d0c8)",
    }}>
      {options.map((option) => (
        <button key={option.id} type="button" data-tour={option.tour}
          onClick={() => onChange(option.id)}
          style={{
            flex: 1, padding: "7px 10px", fontSize: 13, fontFamily: "inherit", cursor: "pointer",
            border: "none",
            background: value === option.id ? "var(--text-color, #2d2a24)" : "transparent",
            color: value === option.id ? "var(--bg-color, #fffcf7)" : "var(--text-color, #2d2a24)",
            fontWeight: value === option.id ? 600 : 400,
          }}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

const rowStyle = {
  display: "flex", alignItems: "center", gap: 10, width: "100%",
  padding: "9px 10px", borderRadius: 8,
  border: "1px solid var(--border-color, #e0dcd4)",
  background: "var(--bg-surface, rgba(255,252,247,0.6))",
};

/**
 * One picker for both halves of the plan: a dish (recipe or a single product) and
 * an add-on to a dish. Roles come from the ingredient catalog, so cottage cheese
 * can be a dish while honey can only join one.
 */
export default function DishPicker({
  role = ROLE_DISH,
  slot,
  dishName,
  meals,
  nutritionContext,
  dishTags,
  onPick,
  onClose,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { enabled, customIngredients } = useUserData();

  const defaultSource = role === ROLE_ADDON ? SOURCE_INGREDIENTS : SOURCE_RECIPES;
  const [memo] = useState(() => loadFilterMemo(role, slot, defaultSource));
  const [source, setSource] = useState(memo.source);
  const [activeTags, setActiveTags] = useState(memo.tags);
  const [query, setQuery] = useState("");
  const [allFilters, setAllFilters] = useState(false);
  const [tagMode, setTagMode] = useState(false);
  const [amounts, setAmounts] = useState({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(memoKey(role, slot), JSON.stringify({ source, tags: activeTags }));
  }, [role, slot, source, activeTags]);

  const recipeOptions = useMemo(() => {
    const list = meals.map((meal) => ({
      kind: KIND_RECIPE,
      id: meal.id,
      name: meal.name,
      emoji: meal.emoji,
      tags: meal.tags,
      meta: [
        `${meal.perPortion.kcal} ${t("recipe.kcal")}`,
        meal.prepTime,
        meal.batchDays > 1 ? t("week.batchDays", { count: meal.batchDays }) : null,
      ].filter(Boolean).join(" · "),
      isAddOn: meal.tags.includes(ADDON_TAG),
    }));
    // Sauces and toppings first when looking for an add-on, hidden nowhere else.
    return role === ROLE_ADDON
      ? list.sort((a, b) => Number(b.isAddOn) - Number(a.isAddOn))
      : list.filter((option) => !option.isAddOn);
  }, [meals, role, t]);

  const ingredientOptions = useMemo(() => (
    Object.keys(ingredientCatalog)
      .filter((id) => ingredientHasRole(id, role))
      .map((id) => ({
        kind: KIND_INGREDIENT,
        id,
        name: ingredientName(id, lang),
        emoji: ingredientEmoji(id),
        tags: ingredientTags(id),
        portion: defaultPortionFor(id, role),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, lang))
    // The catalog is merged in place, so a new personal ingredient changes the
    // list without changing the reference this memo watches.
  ), [role, lang, customIngredients]);

  const options = source === SOURCE_RECIPES ? recipeOptions : ingredientOptions;

  const availableTags = useMemo(() => [
    ...dishTags.customTagIds,
    ...new Set(options.flatMap((option) => option.tags)),
  ], [options, dishTags.customTagIds]);

  // Tags can be deleted right here in tag mode, and a remembered filter can name
  // one that is long gone; either way an unknown personal tag stops filtering.
  const effectiveTags = activeTags.filter((tag) => (
    !isCustomTag(tag) || dishTags.customTagIds.includes(tag)
  ));

  const search = query.trim().toLowerCase();
  const visible = options.filter((option) => {
    if (search && !option.name.toLowerCase().includes(search)) return false;
    if (!effectiveTags.length) return true;
    const own = dishTags.tagsFor(option.kind, option.id);
    return effectiveTags.every((tag) => option.tags.includes(tag) || own.includes(tag));
  });

  const amountFor = (option) => amounts[option.id] ?? option.portion?.amount ?? 100;
  const unitFor = (option) => option.portion?.unit || "g";

  const pick = (option) => {
    if (option.kind === KIND_INGREDIENT) {
      const amount = Number(amountFor(option));
      onPick({
        kind: KIND_INGREDIENT,
        id: option.id,
        amount: amount > 0 ? amount : option.portion?.amount || 100,
        unit: unitFor(option),
      });
    } else {
      onPick({ kind: KIND_RECIPE, id: option.id });
    }
    onClose();
  };

  const toggleTag = (tag) => setActiveTags((prev) => (
    prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
  ));

  return (
    <>
    <Overlay onClose={onClose} maxWidth={560}>
      <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
        {role === ROLE_ADDON
          ? t("picker.titleAddOn", { dish: dishName })
          : t("picker.titleDish", { slot: t(`slots.${slot}`) })}
      </h2>
      <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 14px" }}>
        {role === ROLE_ADDON ? t("picker.addOnHint") : t("picker.filterMemoHint")}
      </p>

      <SegmentedControl
        value={source}
        onChange={setSource}
        options={[
          { id: SOURCE_RECIPES, label: t("picker.recipes"), tour: "picker-recipes" },
          { id: SOURCE_INGREDIENTS, label: t("picker.ingredients"), tour: "picker-products" },
        ]}
      />

      <input
        autoFocus
        data-tour="picker-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("picker.search")}
        style={{ ...inputStyle, margin: "10px 0" }}
      />

      <div data-tour="picker-tags">
        <TagFilterBar
          tags={availableTags}
          active={effectiveTags}
          onToggle={toggleTag}
          onReset={() => setActiveTags([])}
          groups={allFilters ? TAG_GROUPS : PICKER_TAG_GROUPS}
          labelFor={(tag) => (dishTags.customTagIds.includes(tag) ? dishTags.labelFor(tag) : null)}
          small
        />
      </div>

      <div style={{ display: "flex", gap: 10, margin: "10px 0 14px", flexWrap: "wrap" }}>
        <button type="button" onClick={() => setAllFilters((prev) => !prev)}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: "inherit", fontSize: 12, textDecoration: "underline",
            color: "var(--text-color-secondary, #8a8478)",
          }}>
          {allFilters ? t("picker.lessFilters") : t("picker.moreFilters")}
        </button>
        <button type="button" onClick={() => setTagMode((prev) => !prev)}
          style={{ ...tagChipStyle(tagMode, { small: true }) }}>
          {tagMode ? t("picker.tagModeDone") : t("picker.tagMode")}
        </button>
        {/* Missing products are noticed here, while planning, not on a settings tab. */}
        {enabled && source === SOURCE_INGREDIENTS && !tagMode && (
          <button type="button" onClick={() => setCreating(true)}
            style={{ ...tagChipStyle(false, { small: true }), borderStyle: "dashed" }}>
            {t("picker.createIngredient")}
          </button>
        )}
      </div>

      {tagMode && (
        <p style={{ fontSize: 11.5, opacity: 0.5, margin: "0 0 12px" }}>{t("picker.tagModeHint")}</p>
      )}

      {visible.length === 0 && (
        <p style={{ fontSize: 13.5, opacity: 0.5, fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>
          {t("picker.noMatch")}
        </p>
      )}

      <div data-tour="picker-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visible.map((option) => {
          const isIngredient = option.kind === KIND_INGREDIENT;
          const amount = amountFor(option);
          const unit = unitFor(option);
          const entry = isIngredient
            ? { kind: KIND_INGREDIENT, id: option.id, amount: Number(amount) || 0, unit }
            : null;
          const kcal = entry ? entryKcal(entry, nutritionContext) : null;
          const hint = entry ? householdHint(entry, t, lang) : null;
          const meta = isIngredient
            ? [
              kcal != null ? `${kcal} ${t("recipe.kcal")}` : t("picker.noNutritionData"),
              hint,
            ].filter(Boolean).join(" · ")
            : option.meta;

          return (
            <div key={`${option.kind}-${option.id}`} style={rowStyle}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{option.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {tagMode ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{option.name}</div>
                    <DishTagChips dishTags={dishTags} kind={option.kind} id={option.id} small />
                  </>
                ) : (
                  <button type="button" onClick={() => pick(option)}
                    style={{
                      background: "none", border: "none", padding: 0, margin: 0, width: "100%",
                      textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "inherit",
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{option.name}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.55, marginTop: 2 }}>{meta}</div>
                  </button>
                )}
              </div>
              {isIngredient && !tagMode && (
                <span data-tour="picker-amount"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    aria-label={t("week.amount")}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [option.id]: e.target.value }))}
                    style={{
                      width: 62, padding: "5px 6px", fontSize: 13, fontFamily: "inherit",
                      textAlign: "right", borderRadius: 6,
                      border: "1px solid var(--border-color, #d5d0c8)",
                      background: "var(--bg-color, #fffdf8)", color: "var(--text-color, #2d2a24)",
                    }}
                  />
                  <span style={{ fontSize: 11.5, opacity: 0.55 }}>
                    {t(`units.${unit}`, { defaultValue: unit })}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Overlay>

    {/* Outside the picker's overlay: a `position: fixed` dialog nested inside a
        scrolling, backdrop-filtered one is at the mercy of containing blocks. */}
    {creating && (
      <CustomIngredientForm
        // A filter that hid every match is also what hides the new product, so
        // picking it should not take another round of resetting chips.
        onSaved={() => setActiveTags([])}
        onClose={() => setCreating(false)}
      />
    )}
    </>
  );
}
