import { useTranslation } from "react-i18next";
import { DAYS } from "../constants";
import useShoppingList from "../hooks/useShoppingList";

export default function ShoppingList({ weekPlan, weekAddOns, getDayKBJU, filledSlots, meals }) {
  const { t } = useTranslation();
  const { grouped, sortedCategories } = useShoppingList(weekPlan, meals, weekAddOns);

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
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>{t("shopping.title")}</h2>
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
            {grouped[category].map((item, i, arr) => (
              <div key={item.ingredientId + item.unit} style={{
                display: "flex", justifyContent: "space-between", padding: "5px 0",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border-color, rgba(0,0,0,0.06))" : "none",
                fontSize: 14,
              }}>
                <span>{item.name}</span>
                <span style={{ fontWeight: 500, opacity: 0.7, flexShrink: 0, marginLeft: 12 }}>
                  {item.amount > 0 ? `${item.amount} ${t(`units.${item.unit}`, { defaultValue: item.unit })}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>{t("shopping.kbjuTitle")}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DAYS.map(day => {
          const k = getDayKBJU(day);
          if (k.kcal === 0) return null;
          return (
            <div key={day} style={{
              display: "flex", justifyContent: "space-between", padding: "8px 14px",
              border: "1px solid var(--border-color, #e0dcd4)", borderRadius: 8,
              background: k.kcal < 1800 ? "rgba(212,167,106,0.08)" : "var(--bg-surface, rgba(255,252,247,0.6))",
              fontSize: 13,
            }}>
              <span style={{ fontWeight: 600, width: 28 }}>{t(`days.${day}`)}</span>
              <span>{k.kcal} {t("week.kcal")}</span>
              <span>{k.protein}{t("shopping.proteinLabel")}</span>
              <span>{k.fiber}{t("shopping.fiberLabel")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
