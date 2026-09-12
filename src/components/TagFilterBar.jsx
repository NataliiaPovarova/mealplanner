import { useTranslation } from "react-i18next";
import { TAG_GROUPS, groupTags } from "../constants";

/** Chip used for every tag in the app, so filters and cards stay recognisable. */
export function tagChipStyle(isActive, { small = false } = {}) {
  return {
    fontSize: small ? 11.5 : 12,
    padding: small ? "3px 10px" : "5px 12px",
    borderRadius: 20,
    border: isActive
      ? "1.5px solid var(--text-color, #2d2a24)"
      : "1px solid var(--border-color, #d5d0c8)",
    background: isActive ? "var(--text-color, #2d2a24)" : "transparent",
    color: isActive ? "var(--bg-color, #fffcf7)" : "var(--text-color-secondary, #6b6560)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: isActive ? 600 : 400,
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };
}

const groupLabelStyle = {
  fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em",
  opacity: 0.4, fontWeight: 600, width: 74, flexShrink: 0, paddingTop: 7,
};

/**
 * Tag chips grouped the same way everywhere: personal tags, then what is in the
 * dish, what it is, how much work it is, and the nutrition accents. Grouping is
 * the whole point of the vocabulary — a flat row of thirty chips is a list to
 * scroll, a grouped one is a decision tree.
 */
export default function TagFilterBar({
  tags,
  active,
  onToggle,
  onReset,
  groups = TAG_GROUPS,
  labelFor,
  small = false,
}) {
  const { t } = useTranslation();
  const sections = groupTags(tags, { groups });
  if (!sections.length) return null;

  const label = (tag) => labelFor?.(tag) || t(`tags.${tag}`, { defaultValue: tag });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {sections.map(({ group, tags: groupTagIds }) => (
        <div key={group} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={groupLabelStyle}>{t(`tagGroups.${group}`, { defaultValue: group })}</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, flex: 1 }}>
            {groupTagIds.map((tag) => (
              <button key={tag} type="button" onClick={() => onToggle(tag)}
                style={tagChipStyle(active.includes(tag), { small })}>
                {label(tag)}
              </button>
            ))}
          </div>
        </div>
      ))}
      {active.length > 0 && onReset && (
        <div style={{ paddingLeft: 82 }}>
          <button type="button" onClick={onReset}
            style={{
              fontSize: 12, padding: "3px 10px", borderRadius: 20,
              border: "1px dashed var(--border-color, #d5d0c8)", background: "transparent",
              color: "var(--text-color-secondary, #8a8478)", cursor: "pointer",
              fontFamily: "inherit", fontStyle: "italic",
            }}>
            {t("recipes.resetTags")}
          </button>
        </div>
      )}
    </div>
  );
}
