import { useState } from "react";
import { useTranslation } from "react-i18next";
import useRecipes from "../hooks/useRecipes";
import RecipeDetail from "./RecipeDetail";

export default function RecipeList() {
  const { t } = useTranslation();
  const meals = useRecipes();
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [activeTags, setActiveTags] = useState([]);

  const allTags = [...new Set(meals.flatMap(m => m.tags))];
  const toggleTag = (tag) => setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  const filteredMeals = activeTags.length === 0 ? meals : meals.filter(m => activeTags.every(tg => m.tags.includes(tg)));

  if (selectedMeal) {
    const currentMeal = meals.find(m => m.id === selectedMeal.id) || selectedMeal;
    return <RecipeDetail meal={currentMeal} onBack={() => setSelectedMeal(null)} />;
  }

  return (
    <div>
      <p style={{ fontSize: 14, marginBottom: 14, opacity: 0.7 }}>
        {t("recipes.count", { count: meals.length })}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        {allTags.map(tag => {
          const isActive = activeTags.includes(tag);
          return (
            <button key={tag} onClick={() => toggleTag(tag)}
              style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 20,
                border: isActive ? "1.5px solid var(--text-color, #2d2a24)" : "1px solid var(--border-color, #d5d0c8)",
                background: isActive ? "var(--text-color, #2d2a24)" : "transparent",
                color: isActive ? "var(--bg-color, #fffcf7)" : "var(--text-color-secondary, #6b6560)",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s ease",
                fontWeight: isActive ? 600 : 400,
              }}>{t(`tags.${tag}`, { defaultValue: tag })}</button>
          );
        })}
        {activeTags.length > 0 && (
          <button onClick={() => setActiveTags([])}
            style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, border: "1px dashed var(--border-color, #d5d0c8)", background: "transparent", color: "var(--text-color-secondary, #8a8478)", cursor: "pointer", fontFamily: "inherit", fontStyle: "italic" }}>
            {t("recipes.resetTags")}
          </button>
        )}
      </div>
      {filteredMeals.length === 0 && (
        <p style={{ fontSize: 14, opacity: 0.5, fontStyle: "italic", textAlign: "center", padding: "32px 0" }}>
          {t("recipes.noMatch")}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredMeals.map(meal => (
          <button key={meal.id} onClick={() => setSelectedMeal(meal)}
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
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{meal.name}</div>
              <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 6 }}>{meal.description}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
    </div>
  );
}
