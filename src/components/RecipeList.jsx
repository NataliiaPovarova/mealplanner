import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useRecipes from "../hooks/useRecipes";
import RecipeDetail from "./RecipeDetail";
import RecipeEditor from "./RecipeEditor";
import TagFilterBar from "./TagFilterBar";
import { useUserData } from "../contexts/UserDataContext";
import { isCustomTag } from "../hooks/useDishTags";
import { KIND_RECIPE } from "../utils/planEntries";
import { inputStyle, primaryButtonStyle } from "./ui";

function Badge({ children }) {
  return (
    <span style={{
      fontSize: 10.5, padding: "2px 7px", borderRadius: 20, marginLeft: 6,
      border: "1px solid var(--border-color, #d5d0c8)",
      color: "var(--text-color-secondary, #8a8478)", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export default function RecipeList({ dishTags }) {
  const { t } = useTranslation();
  const meals = useRecipes();
  const { enabled } = useUserData();
  const [selectedId, setSelectedId] = useState(null);
  const [editorTarget, setEditorTarget] = useState(null);
  const [activeTags, setActiveTags] = useState([]);
  const [query, setQuery] = useState("");

  const availableTags = useMemo(() => [
    ...dishTags.customTagIds,
    ...new Set(meals.flatMap((meal) => meal.tags)),
  ], [meals, dishTags.customTagIds]);

  const toggleTag = (tag) => setActiveTags(prev => (
    prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]
  ));

  // A personal tag can be deleted while it filters the list; ignoring it beats
  // showing nothing with no chip left to un-click.
  const effectiveTags = activeTags.filter((tag) => (
    !isCustomTag(tag) || dishTags.customTagIds.includes(tag)
  ));

  const search = query.trim().toLowerCase();
  const filteredMeals = meals.filter((meal) => {
    if (search && !meal.name.toLowerCase().includes(search)) return false;
    if (!effectiveTags.length) return true;
    const own = dishTags.tagsFor(KIND_RECIPE, meal.id);
    return effectiveTags.every((tag) => meal.tags.includes(tag) || own.includes(tag));
  });

  // Resolving by id keeps the detail view in sync after an edit and falls back
  // to the list when the recipe was deleted or hidden.
  const selectedMeal = selectedId ? meals.find(m => m.id === selectedId) : null;

  const editor = editorTarget && (
    <RecipeEditor
      meal={editorTarget === "new" ? null : editorTarget}
      meals={meals}
      onClose={() => setEditorTarget(null)}
    />
  );

  if (selectedMeal) {
    return (
      <>
        <RecipeDetail
          meal={selectedMeal}
          onBack={() => setSelectedId(null)}
          onEdit={enabled ? () => setEditorTarget(selectedMeal) : null}
          dishTags={dishTags}
        />
        {editor}
      </>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 14, marginBottom: 14, opacity: 0.7 }}>
        {t("recipes.count", { count: meals.length })}
      </p>

      {enabled && (
        <button onClick={() => setEditorTarget("new")} style={{ ...primaryButtonStyle, marginBottom: 18 }}>
          {t("recipes.create")}
        </button>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("picker.search")}
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      <div style={{ marginBottom: 18 }}>
        <TagFilterBar
          tags={availableTags}
          active={effectiveTags}
          onToggle={toggleTag}
          onReset={() => setActiveTags([])}
          labelFor={(tag) => (dishTags.customTagIds.includes(tag) ? dishTags.labelFor(tag) : null)}
        />
      </div>

      {filteredMeals.length === 0 && (
        <p style={{ fontSize: 14, opacity: 0.5, fontStyle: "italic", textAlign: "center", padding: "32px 0" }}>
          {t("recipes.noMatch")}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredMeals.map(meal => (
          <button key={meal.id} onClick={() => setSelectedId(meal.id)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 18px",
              border: "1px solid var(--border-color, #e0dcd4)", borderRadius: 10,
              background: "var(--bg-surface, rgba(255,252,247,0.6))",
              cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              transition: "all 0.15s ease", color: "inherit",
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = "var(--text-color-secondary, #8a8478)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border-color, #e0dcd4)"; e.currentTarget.style.transform = "none"; }}
          >
            <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{meal.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                {meal.name}
                {meal.isUserRecipe && <Badge>{t("recipes.ownBadge")}</Badge>}
                {meal.isEditedBaseRecipe && <Badge>{t("recipes.editedBadge")}</Badge>}
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 6 }}>{meal.description}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {dishTags.tagsFor(KIND_RECIPE, meal.id).map(tag => (
                  <span key={tag} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, border: "1px solid var(--border-color, #d5d0c8)", opacity: 0.8 }}>{dishTags.labelFor(tag)}</span>
                ))}
                {meal.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "var(--bg-tag, rgba(0,0,0,0.05))", opacity: 0.7 }}>{t(`tags.${tag}`, { defaultValue: tag })}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, fontSize: 12, opacity: 0.55, paddingTop: 2 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{meal.perPortion.kcal}</div>
              <div>{t("recipe.kcal")}</div>
              <div style={{ marginTop: 4 }}>{meal.perPortion.protein}{t("recipes.proteinLabel")}</div>
            </div>
          </button>
        ))}
      </div>

      {editor}
    </div>
  );
}
