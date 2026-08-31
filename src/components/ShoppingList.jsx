import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DAYS } from "../constants";
import useShoppingList from "../hooks/useShoppingList";
import useShoppingChecks, { itemKey } from "../hooks/useShoppingChecks";
import NutrientSummary from "./NutrientSummary";
import { formatShoppingAmount } from "../utils/shoppingMeasure";

export default function ShoppingList({ weekPlan, weekAddOns, getDayKBJU, filledSlots, meals }) {
  const { t, i18n } = useTranslation();
  const { grouped, sortedCategories } = useShoppingList(weekPlan, meals, weekAddOns);
  const { isChecked, toggle } = useShoppingChecks();
  const [pdfBusy, setPdfBusy] = useState(false);

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { default: generateShoppingListPdf } = await import("../utils/generateShoppingListPdf");
      await generateShoppingListPdf({ grouped, sortedCategories, t, language: i18n.language });
    } catch (e) {
      console.error("Shopping list PDF generation failed:", e);
    } finally {
      setPdfBusy(false);
    }
  };

  if (filledSlots === 0) {
    return (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>{t("shopping.title")}</h2>
        <p style={{ fontSize: 14, opacity: 0.5, fontStyle: "italic", textAlign: "center", padding: "32px 0" }}>
          {t("shopping.empty")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("shopping.title")}</h2>
        <button onClick={handleDownloadPdf} disabled={pdfBusy}
          style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, border: "1px solid var(--border-color, #d5d0c8)", background: "transparent", cursor: pdfBusy ? "wait" : "pointer", fontFamily: "inherit", color: "var(--text-color-secondary, #8a8478)", flexShrink: 0, marginLeft: 12, opacity: pdfBusy ? 0.5 : 1 }}>
          {pdfBusy ? t("pdf.generating") : t("pdf.download")}
        </button>
      </div>
      <p style={{ fontSize: 13, opacity: 0.6, margin: "0 0 16px" }}>{t("shopping.hint")}</p>

      {sortedCategories.map(category => (
        <div key={category} style={{ marginBottom: 16 }}>
          <h3 style={{
            fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em",
            fontWeight: 600, opacity: 0.45, margin: "0 0 6px",
          }}>{t(`category.${category}`)}</h3>
          <div style={{
            padding: "12px 18px", border: "1px solid var(--border-color, #e0dcd4)",
            borderRadius: 10, background: "var(--bg-surface, rgba(255,252,247,0.6))",
          }}>
            {grouped[category].map((item, i, arr) => {
              const key = itemKey(item.ingredientId, item.unit);
              const checked = isChecked(key);
              return (
                <label key={key} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "5px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--border-color, rgba(0,0,0,0.06))" : "none",
                  fontSize: 14, cursor: "pointer",
                }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                    style={{ width: 16, height: 16, flexShrink: 0, cursor: "pointer", accentColor: "var(--text-color, #2d2a24)" }}
                  />
                  <span style={{
                    flex: 1, minWidth: 0,
                    textDecoration: checked ? "line-through" : "none",
                    opacity: checked ? 0.45 : 1,
                  }}>{item.name}</span>
                  <span style={{
                    fontWeight: 500, opacity: checked ? 0.35 : 0.7, flexShrink: 0, marginLeft: 12,
                    textDecoration: checked ? "line-through" : "none",
                  }}>
                    {formatShoppingAmount(item, t, i18n.language)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>{t("shopping.kbjuTitle")}</h3>
      <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 10px" }}>{t("nutrition.sourceNote")}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DAYS.map(day => {
          const k = getDayKBJU(day);
          if (k.kcal === 0) return null;
          return (
            <div key={day} style={{
              padding: "8px 14px",
              border: "1px solid var(--border-color, #e0dcd4)", borderRadius: 8,
              background: k.kcal < 1800 ? "rgba(212,167,106,0.08)" : "var(--bg-surface, rgba(255,252,247,0.6))",
              fontSize: 13,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontWeight: 600, width: 28 }}>{t(`days.${day}`)}</span>
                <span>{k.kcal} {t("week.kcal")}</span>
                <span>{k.protein}{t("shopping.proteinLabel")}</span>
                <span>{k.fat}{t("shopping.fatLabel")}</span>
                <span>{k.carbs}{t("shopping.carbsLabel")}</span>
                <span>{k.fiber}{t("shopping.fiberLabel")}</span>
              </div>
              <NutrientSummary nutrients={k.nutrients} t={t} compact />
            </div>
          );
        })}
      </div>
    </div>
  );
}
