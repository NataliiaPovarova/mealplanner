import { useState } from "react";
import { MICRO_KEYS, NUTRIENT_UNITS } from "../utils/nutrition";

/**
 * Collapsible micronutrient summary for a day (or recipe).
 * `nutrients` is a map of micro key → value (zeros omitted preferred).
 */
export default function NutrientSummary({ nutrients, t, compact = false, defaultOpen = false, alwaysOpen = false }) {
  const [open, setOpen] = useState(defaultOpen || alwaysOpen);
  const entries = MICRO_KEYS
    .filter((k) => nutrients?.[k] != null && nutrients[k] !== 0)
    .map((k) => ({
      key: k,
      value: nutrients[k],
      unit: NUTRIENT_UNITS[k],
    }));

  if (!entries.length) return null;

  const showList = alwaysOpen || open;

  return (
    <div style={{ marginTop: compact ? 4 : 8 }}>
      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: compact ? 11 : 12,
            fontFamily: "inherit",
            color: "var(--text-color-secondary, #8a8478)",
            textDecoration: "underline",
            textUnderlineOffset: 2,
          }}
        >
          {open ? t("nutrition.hideMicros") : t("nutrition.showMicros")}
        </button>
      )}
      {showList && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px 12px",
            marginTop: alwaysOpen ? 0 : 6,
            fontSize: compact ? 11 : 12,
            opacity: 0.75,
          }}
        >
          {entries.map(({ key, value, unit }) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{t(`nutrition.${key}`)}</span>
              <span style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                {value}
                {t(`units.${unit}`, { defaultValue: unit })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

