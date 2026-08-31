import { useTranslation } from "react-i18next";
import { formatIngredient } from "../constants";
import { knownMicros } from "../utils/nutrition";
import NutrientSummary from "./NutrientSummary";

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.45, fontWeight: 600, margin: "0 0 8px" }}>{title}</h3>
      {children}
    </div>
  );
}

export default function RecipeDetail({ meal, onBack }) {
  const { t, i18n } = useTranslation();
  const micros = knownMicros(meal);
  const nutrientMap = Object.fromEntries(micros.map((m) => [m.key, m.value]));

  return (
    <div>
      <button onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "var(--text-color-secondary, #8a8478)", padding: "0 0 16px", display: "flex", alignItems: "center", gap: 4 }}>
        {t("recipes.back")}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 36 }}>{meal.emoji}</span>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{meal.name}</h2>
          <div style={{ fontSize: 13, opacity: 0.55, marginTop: 2 }}>
            {t("recipe.prep")} {meal.prepTime} · {t("recipe.cook")} {meal.cookTime} · {meal.portions} {t("recipe.portions")}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 0, margin: "16px 0 8px", borderRadius: 8, overflow: "hidden", fontSize: 12, fontWeight: 500 }}>
        {[
          { label: `${meal.perPortion.kcal} ${t("recipe.kcal")}`, color: "#6b8f71", flex: 3 },
          { label: `${t("recipe.protein")} ${meal.perPortion.protein}${t("units.g")}`, color: "#7a9cc6", flex: 2 },
          { label: `${t("recipe.fat")} ${meal.perPortion.fat}${t("units.g")}`, color: "#d4a76a", flex: 1.2 },
          { label: `${t("recipe.carbs")} ${meal.perPortion.carbs}${t("units.g")}`, color: "#c47d7d", flex: 2.5 },
          { label: `${t("recipe.fiber")} ${meal.perPortion.fiber}${t("units.g")}`, color: "#9b8ec4", flex: 1.5 },
        ].map((seg, i) => (
          <div key={i} style={{ flex: seg.flex, background: seg.color, color: "#fff", padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap", fontSize: 11 }}>{seg.label}</div>
        ))}
      </div>
      <p style={{ fontSize: 11, opacity: 0.45, margin: "0 0 16px" }}>{t("nutrition.sourceNote")}</p>
      {micros.length > 0 && (
        <Section title={t("nutrition.microsTitle")}>
          <NutrientSummary nutrients={nutrientMap} t={t} alwaysOpen />
        </Section>
      )}
      <Section title={t("recipe.ingredients")}>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {meal.ingredients.map((ing, i) => (<li key={i} style={{ fontSize: 14, marginBottom: 4 }}>{formatIngredient(ing, t, i18n.language)}</li>))}
        </ul>
      </Section>
      <Section title={t("recipe.steps")}>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          {meal.steps.map((step, i) => (<li key={i} style={{ fontSize: 14, marginBottom: 6 }}>{step}</li>))}
        </ol>
      </Section>
      <Section title={t("recipe.tips")}>
        <p style={{ fontSize: 14, margin: 0, fontStyle: "italic", opacity: 0.75 }}>{meal.tips}</p>
      </Section>
      {meal.freshAdd && (
        <Section title={t("recipe.freshAdd")}>
          <p style={{ fontSize: 14, margin: 0 }}>{meal.freshAdd}</p>
        </Section>
      )}
    </div>
  );
}
