import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ingredientName } from "../constants";
import { useUserData } from "../contexts/UserDataContext";
import { LABEL_KEYS, NUTRIENT_UNITS } from "../utils/nutrition";
import { ROLE_ADDON, ROLE_DISH, ingredientEmoji } from "../utils/planEntries";
import CustomIngredientForm from "./CustomIngredientForm";
import { dangerButtonStyle, ghostButtonStyle, primaryButtonStyle } from "./ui";

const ROLES = [ROLE_DISH, ROLE_ADDON];

/**
 * Ingredients the shipped catalog does not have. Unlike a brand product, which
 * refines an existing entry, these are new entries of their own — they show up
 * in the dish picker, the recipe editor and the shopping list like any other.
 */
export default function CustomIngredients() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "ru";
  const { customIngredients, deleteCustomIngredient } = useUserData();

  const [editing, setEditing] = useState(null);

  const sorted = useMemo(() => (
    [...customIngredients].sort((a, b) => (
      ingredientName(a.id, lang).localeCompare(ingredientName(b.id, lang), lang)
    ))
  ), [customIngredients, lang]);

  const handleDelete = async (ingredient) => {
    if (!window.confirm(t("myIngredients.confirmDelete"))) return;
    await deleteCustomIngredient(ingredient.id);
  };

  const summaryOf = (ingredient) => {
    const roles = ROLES
      .filter((role) => ingredient.roles?.includes(role))
      .map((role) => t(`myIngredients.roleShort.${role}`, {
        amount: ingredient.portion?.[role],
        unit: t(`units.${ingredient.portion?.unit || "g"}`),
      }));
    return [t(`category.${ingredient.category}`), ...roles].join(" · ");
  };

  const nutritionOf = (ingredient) => {
    const listed = LABEL_KEYS.filter((key) => ingredient.per100g?.[key] != null);
    if (!listed.length) return t("myIngredients.noNutrition");
    return listed
      .map((key) => `${t(`products.field.${key}`)} ${ingredient.per100g[key]}${t(`units.${NUTRIENT_UNITS[key]}`)}`)
      .join(" · ");
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
        {t("myIngredients.title")}
      </h2>
      <p style={{ fontSize: 14, marginBottom: 6, opacity: 0.7 }}>{t("myIngredients.intro")}</p>
      <p style={{ fontSize: 12.5, marginBottom: 18, opacity: 0.5 }}>{t("myIngredients.nutritionNote")}</p>

      <button onClick={() => setEditing({ id: null, info: null })}
        style={{ ...primaryButtonStyle, marginBottom: 20 }}>
        {t("myIngredients.add")}
      </button>

      {sorted.length === 0 && (
        <p style={{ fontSize: 14, opacity: 0.5, fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
          {t("myIngredients.empty")}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((ingredient) => (
          <div key={ingredient.id} style={{
            border: "1px solid var(--border-color, #e0dcd4)",
            borderRadius: 10, padding: "12px 14px",
            background: "var(--bg-surface, rgba(255,252,247,0.6))",
          }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{ingredientEmoji(ingredient.id)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5 }}>{ingredientName(ingredient.id, lang)}</div>
                <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 3 }}>{summaryOf(ingredient)}</div>
                <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 3 }}>{nutritionOf(ingredient)}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={() => setEditing({ id: ingredient.id, info: ingredient })}
                style={{ ...ghostButtonStyle, padding: "5px 12px", fontSize: 12.5 }}>
                {t("common.edit")}
              </button>
              <button onClick={() => handleDelete(ingredient)}
                style={{ ...dangerButtonStyle, padding: "5px 12px", fontSize: 12.5 }}>
                {t("common.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <CustomIngredientForm
          id={editing.id}
          info={editing.info}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
