import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DAYS, SLOTS } from "../constants";
import NutrientSummary from "./NutrientSummary";

const ADDON_SUFFIX = ":addon";
const addOnKey = (day, slot) => `${day}-${slot}${ADDON_SUFFIX}`;

const dropdownStyle = {
  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
  background: "var(--bg-color, #fff)", border: "1px solid var(--border-color, #e0dcd4)",
  borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", maxHeight: 280, overflowY: "auto",
  WebkitOverflowScrolling: "touch",
};

export default function WeekPlanner({ plan, meals }) {
  const { t, i18n } = useTranslation();
  const [pdfBusy, setPdfBusy] = useState(false);
  const {
    weekPlan, weekAddOns, cellKey, setSlot, clearSlot, clearAll,
    setAddOn, clearAddOn,
    getBatchWarnings, dismissWarning, getDayKBJU,
    openDropdown, setOpenDropdown, getMealsForSlot, getAddOns,
  } = plan;

  const filledSlots = Object.keys(weekPlan).length;
  const batchWarnings = getBatchWarnings();
  const addOnOptions = getAddOns();

  const handleDownloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { default: generateWeekPlanPdf } = await import("../utils/generateWeekPlanPdf");
      await generateWeekPlanPdf({ weekPlan, weekAddOns, meals, t, language: i18n.language });
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, opacity: 0.6, margin: 0 }}>{t("week.hint")}</p>
        {filledSlots > 0 && (
          <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
            <button onClick={handleDownloadPdf} disabled={pdfBusy}
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
          const hasAny = SLOTS.some(s => weekPlan[cellKey(day, s)]);
          const anyDropdownOpenOnDay = SLOTS.some(s => {
            const k = cellKey(day, s);
            return openDropdown === k || openDropdown === `${k}${ADDON_SUFFIX}`;
          });
          return (
            <div key={day} style={{
              border: "1px solid var(--border-color, #e0dcd4)", borderRadius: 10,
              background: "var(--bg-surface, rgba(255,252,247,0.6))",
              position: "relative",
              zIndex: anyDropdownOpenOnDay ? 20 : 1,
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
                  const key = cellKey(day, slot);
                  const mealId = weekPlan[key];
                  const meal = mealId ? meals.find(m => m.id === mealId) : null;
                  const isOpen = openDropdown === key;
                  const options = getMealsForSlot(slot);

                  const addOnId = weekAddOns[key];
                  const addOn = addOnId ? meals.find(m => m.id === addOnId) : null;
                  const isAddOnOpen = openDropdown === addOnKey(day, slot);

                  return (
                    <div key={slot} style={{ marginBottom: 6 }}>
                      <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, opacity: 0.45, width: 62, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                            {t(`slots.${slot}`)}
                          </span>
                          {meal ? (
                            <div style={{
                              display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0,
                              padding: "5px 10px", borderRadius: 6,
                              background: "var(--bg-tag, rgba(0,0,0,0.03))",
                              border: "1px solid var(--border-color, #e8e4dc)",
                            }}>
                              <span style={{ fontSize: 14 }}>{meal.emoji}</span>
                              <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{meal.name}</span>
                              <span style={{ fontSize: 11, opacity: 0.45, flexShrink: 0 }}>{meal.perPortion.kcal} {t("week.kcal")}</span>
                              <button onClick={() => clearSlot(day, slot)}
                                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, opacity: 0.4, padding: "0 2px", flexShrink: 0 }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setOpenDropdown(isOpen ? null : key)}
                              style={{
                                flex: 1, padding: "5px 10px", borderRadius: 6, fontSize: 13,
                                border: "1px dashed var(--border-color, #d5d0c8)",
                                background: "transparent", cursor: "pointer", textAlign: "left",
                                fontFamily: "inherit", color: "var(--text-color-secondary, #8a8478)",
                                fontStyle: "italic",
                              }}>
                              {t("week.choose")}
                            </button>
                          )}
                        </div>
                        {isOpen && (
                          <div style={dropdownStyle}>
                            <div onClick={() => setOpenDropdown(null)}
                              style={{ padding: "6px 12px", fontSize: 12, opacity: 0.45, cursor: "pointer", borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.06))" }}>
                              {t("week.skip")}
                            </div>
                            {options.map(opt => (
                              <div key={opt.id} onClick={() => setSlot(day, slot, opt.id)}
                                style={{
                                  padding: "8px 12px", cursor: "pointer", fontSize: 13,
                                  display: "flex", alignItems: "center", gap: 8,
                                  borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.04))",
                                }}
                                onMouseOver={e => e.currentTarget.style.background = "var(--bg-tag, rgba(0,0,0,0.04))"}
                                onMouseOut={e => e.currentTarget.style.background = "transparent"}
                              >
                                <span>{opt.emoji}</span>
                                <span style={{ flex: 1 }}>{opt.name}</span>
                                {opt.batchDays > 1 && <span style={{ fontSize: 10, opacity: 0.5 }}>{t("week.batchDays", { count: opt.batchDays })}</span>}
                                <span style={{ fontSize: 11, opacity: 0.45 }}>{opt.perPortion.kcal}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {meal && addOnOptions.length > 0 && (
                        <div style={{ position: "relative", marginTop: 4, paddingLeft: 70 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, opacity: 0.35, flexShrink: 0 }}>↳</span>
                            {addOn ? (
                              <div style={{
                                display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0,
                                padding: "3px 8px", borderRadius: 5,
                                background: "var(--bg-tag, rgba(0,0,0,0.02))",
                                border: "1px dashed var(--border-color, #e8e4dc)",
                              }}>
                                <span style={{ fontSize: 12 }}>{addOn.emoji}</span>
                                <span style={{ fontSize: 12, flex: 1, minWidth: 0, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis" }}>{addOn.name}</span>
                                <span style={{ fontSize: 10, opacity: 0.45, flexShrink: 0 }}>+{addOn.perPortion.kcal} {t("week.kcal")}</span>
                                <button onClick={() => clearAddOn(day, slot)}
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, opacity: 0.4, padding: "0 2px", flexShrink: 0 }}>✕</button>
                              </div>
                            ) : (
                              <button onClick={() => setOpenDropdown(isAddOnOpen ? null : addOnKey(day, slot))}
                                style={{
                                  padding: "2px 8px", borderRadius: 5, fontSize: 11,
                                  border: "1px dashed var(--border-color, #d5d0c8)",
                                  background: "transparent", cursor: "pointer",
                                  fontFamily: "inherit", color: "var(--text-color-secondary, #8a8478)",
                                  fontStyle: "italic", opacity: 0.75,
                                }}>
                                {t("week.addOnChoose")}
                              </button>
                            )}
                          </div>
                          {isAddOnOpen && (
                            <div style={{ ...dropdownStyle, left: 20 }}>
                              <div onClick={() => setOpenDropdown(null)}
                                style={{ padding: "6px 12px", fontSize: 12, opacity: 0.45, cursor: "pointer", borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.06))" }}>
                                {t("week.skip")}
                              </div>
                              {addOnOptions.map(opt => (
                                <div key={opt.id} onClick={() => setAddOn(day, slot, opt.id)}
                                  style={{
                                    padding: "8px 12px", cursor: "pointer", fontSize: 13,
                                    display: "flex", alignItems: "center", gap: 8,
                                    borderBottom: "1px solid var(--border-color, rgba(0,0,0,0.04))",
                                  }}
                                  onMouseOver={e => e.currentTarget.style.background = "var(--bg-tag, rgba(0,0,0,0.04))"}
                                  onMouseOut={e => e.currentTarget.style.background = "transparent"}
                                >
                                  <span>{opt.emoji}</span>
                                  <span style={{ flex: 1 }}>{opt.name}</span>
                                  <span style={{ fontSize: 11, opacity: 0.45 }}>+{opt.perPortion.kcal}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
