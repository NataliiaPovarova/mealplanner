import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DAYS, SLOTS } from "../constants";
import {
  KIND_INGREDIENT,
  ROLE_ADDON,
  ROLE_DISH,
  entryEmoji,
  entryKcal,
  entryName,
  householdHint,
} from "../utils/planEntries";
import DishPicker from "./DishPicker";
import NutrientSummary from "./NutrientSummary";

const slotLabelStyle = {
  fontSize: 11, opacity: 0.45, width: 62, flexShrink: 0, paddingTop: 6,
  textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
};

const addButtonStyle = {
  padding: "4px 10px", borderRadius: 6, fontSize: 12, alignSelf: "flex-start",
  border: "1px dashed var(--border-color, #d5d0c8)", background: "transparent",
  cursor: "pointer", fontFamily: "inherit", fontStyle: "italic",
  color: "var(--text-color-secondary, #8a8478)",
};

const removeButtonStyle = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 13, opacity: 0.4, padding: "0 2px", flexShrink: 0,
};

const amountInputStyle = {
  width: 54, padding: "2px 4px", fontSize: 12, fontFamily: "inherit", textAlign: "right",
  borderRadius: 5, border: "1px solid var(--border-color, #e8e4dc)",
  background: "var(--bg-color, #fffdf8)", color: "var(--text-color, #2d2a24)",
};

/** Amount lives on the chip: changing a portion is a two-second edit, not a re-pick. */
function AmountField({ entry, onChange, t, language }) {
  if (entry.kind !== KIND_INGREDIENT) return null;
  const hint = householdHint(entry, t, language);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0 }}
      title={hint || t("week.amountHint")}>
      <input
        type="number"
        min="1"
        value={entry.amount}
        aria-label={t("week.amount")}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (next > 0) onChange(next);
        }}
        style={amountInputStyle}
      />
      <span style={{ fontSize: 10.5, opacity: 0.5 }}>
        {t(`units.${entry.unit}`, { defaultValue: entry.unit })}
      </span>
    </span>
  );
}

export default function WeekPlanner({ plan, meals, dishTags }) {
  const { t, i18n } = useTranslation();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [picker, setPicker] = useState(null);

  const {
    weekPlan, cellKey, nutritionContext, plannedDishes, dishesInSlot,
    addDish, removeDish, setDishAmount,
    addAddOn, removeAddOn, setAddOnAmount,
    clearAll, getBatchWarnings, dismissWarning, getDayKBJU,
  } = plan;

  const batchWarnings = getBatchWarnings();
  const nameOf = (entry) => entryName(entry, { ...nutritionContext, lang: i18n.language });

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { default: generateWeekPlanPdf } = await import("../utils/generateWeekPlanPdf");
      await generateWeekPlanPdf({ weekPlan, meals, t, language: i18n.language });
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setPdfBusy(false);
    }
  };

  const handlePick = (draft) => {
    if (!picker) return;
    if (picker.role === ROLE_ADDON) addAddOn(picker.day, picker.slot, picker.dishKey, draft);
    else addDish(picker.day, picker.slot, draft);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, opacity: 0.6, margin: 0 }}>{t("week.hint")}</p>
        {plannedDishes > 0 && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
            <button data-tour="week-pdf" onClick={handleDownloadPdf} disabled={pdfBusy}
              style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, border: "1px solid var(--border-color, #d5d0c8)", background: "transparent", cursor: pdfBusy ? "wait" : "pointer", fontFamily: "inherit", color: "var(--text-color-secondary, #8a8478)", flexShrink: 0, opacity: pdfBusy ? 0.5 : 1 }}>
              {pdfBusy ? t("pdf.generating") : t("pdf.download")}
            </button>
            <button onClick={clearAll}
              style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, border: "1px dashed var(--border-color, #d5d0c8)", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "var(--text-color-secondary, #8a8478)", fontStyle: "italic", flexShrink: 0 }}>
              {t("week.clear")}
            </button>
          </div>
        )}
      </div>

      {batchWarnings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {batchWarnings.map(w => (
            <div key={w.dismissKey} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 12px", borderRadius: 8, fontSize: 12,
              background: "rgba(212,167,106,0.12)", border: "1px solid rgba(212,167,106,0.25)",
            }}>
              <span>
                {w.meal.emoji} <strong>{w.meal.name}</strong>: {t("week.batchWarning", { expected: w.expected, count: w.count })}
              </span>
              <button onClick={() => dismissWarning(w.dismissKey)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.5, padding: "0 4px" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {DAYS.map(day => {
          const dayKBJU = getDayKBJU(day);
          const hasAny = SLOTS.some(slot => dishesInSlot(day, slot).length > 0);
          return (
            <div key={day} style={{
              border: "1px solid var(--border-color, #e0dcd4)", borderRadius: 10,
              background: "var(--bg-surface, rgba(255,252,247,0.6))",
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", background: "var(--bg-tag, rgba(0,0,0,0.02))",
                borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.05))",
              }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{t(`days.${day}`)}</span>
                {hasAny && (
                  <span style={{ fontSize: 11, opacity: 0.55, textAlign: "right", maxWidth: "70%" }}>
                    {dayKBJU.kcal} {t("week.kcal")} · {dayKBJU.protein}{t("week.protein")} · {dayKBJU.fat}{t("week.fat")} · {dayKBJU.carbs}{t("week.carbs")} · {dayKBJU.fiber}{t("week.fiber")}
                  </span>
                )}
              </div>
              {hasAny && (
                <div style={{ padding: "0 14px" }}>
                  <NutrientSummary nutrients={dayKBJU.nutrients} t={t} compact />
                </div>
              )}

              <div style={{ padding: "8px 14px 12px" }}>
                {SLOTS.map(slot => {
                  const dishes = dishesInSlot(day, slot);
                  return (
                    <div key={slot} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <span style={slotLabelStyle}>{t(`slots.${slot}`)}</span>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        {dishes.map(dish => (
                          <div key={dish.key} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <div style={{
                              display: "flex", alignItems: "center", gap: 6, minWidth: 0,
                              padding: "5px 10px", borderRadius: 6,
                              background: "var(--bg-tag, rgba(0,0,0,0.03))",
                              border: "1px solid var(--border-color, #e8e4dc)",
                            }}>
                              <span style={{ fontSize: 14 }}>{entryEmoji(dish, nutritionContext)}</span>
                              <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {nameOf(dish)}
                              </span>
                              <AmountField entry={dish} t={t} language={i18n.language}
                                onChange={(amount) => setDishAmount(day, slot, dish.key, amount)} />
                              <span style={{ fontSize: 11, opacity: 0.45, flexShrink: 0 }}>
                                {entryKcal(dish, nutritionContext) ?? "—"} {t("week.kcal")}
                              </span>
                              <button
                                data-tour="week-add-addon"
                                onClick={() => setPicker({
                                  day, slot, role: ROLE_ADDON, dishKey: dish.key, dishName: nameOf(dish),
                                })}
                                title={t("week.addOnChoose")}
                                style={{ ...removeButtonStyle, fontSize: 15, opacity: 0.5 }}>＋</button>
                              <button onClick={() => removeDish(day, slot, dish.key)} style={removeButtonStyle}>✕</button>
                            </div>

                            {(dish.addOns || []).map(addOn => (
                              <div key={addOn.key} style={{
                                display: "flex", alignItems: "center", gap: 6, minWidth: 0,
                                marginLeft: 18, padding: "3px 8px", borderRadius: 5,
                                background: "var(--bg-tag, rgba(0,0,0,0.02))",
                                border: "1px dashed var(--border-color, #e8e4dc)",
                              }}>
                                <span style={{ fontSize: 11, opacity: 0.35 }}>↳</span>
                                <span style={{ fontSize: 12, flex: 1, minWidth: 0, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {nameOf(addOn)}
                                </span>
                                <AmountField entry={addOn} t={t} language={i18n.language}
                                  onChange={(amount) => setAddOnAmount(day, slot, dish.key, addOn.key, amount)} />
                                <span style={{ fontSize: 10, opacity: 0.45, flexShrink: 0 }}>
                                  +{entryKcal(addOn, nutritionContext) ?? "—"} {t("week.kcal")}
                                </span>
                                <button onClick={() => removeAddOn(day, slot, dish.key, addOn.key)}
                                  style={{ ...removeButtonStyle, fontSize: 12 }}>✕</button>
                              </div>
                            ))}
                          </div>
                        ))}

                        <button data-tour="week-add-dish"
                          onClick={() => setPicker({ day, slot, role: ROLE_DISH })} style={addButtonStyle}>
                          {t("week.addDish")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {picker && (
        <DishPicker
          role={picker.role}
          slot={picker.slot}
          dishName={picker.dishName}
          meals={meals}
          nutritionContext={nutritionContext}
          dishTags={dishTags}
          onPick={handlePick}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
