import { useState } from "react";
import { useTranslation } from "react-i18next";
import { tagChipStyle } from "./TagFilterBar";

const iconButtonStyle = {
  background: "none", border: "none", cursor: "pointer", padding: "0 2px",
  fontSize: 11, opacity: 0.35, fontFamily: "inherit", color: "inherit",
};

const linkButtonStyle = {
  background: "none", border: "none", padding: "0 4px", cursor: "pointer",
  fontFamily: "inherit", fontSize: 11.5, textDecoration: "underline",
  color: "var(--text-color-secondary, #8a8478)",
};

/** Name field shared by creating and renaming; the draft is local so Escape can drop it. */
function TagNameField({ initial, submitLabel, onSubmit, onCancel, small }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit(draft);
          if (e.key === "Escape") onCancel();
        }}
        placeholder={t("dishTags.namePlaceholder")}
        style={{
          width: 130, padding: "3px 8px", fontSize: 12, fontFamily: "inherit",
          borderRadius: 20, border: "1px solid var(--border-color, #d5d0c8)",
          background: "var(--bg-color, #fffdf8)", color: "var(--text-color, #2d2a24)",
        }}
      />
      <button type="button" onClick={() => onSubmit(draft)} style={tagChipStyle(true, { small })}>
        {submitLabel}
      </button>
    </span>
  );
}

/**
 * Toggles the user's own tags on one dish — a recipe or a catalog ingredient.
 * Creating a tag happens right here, because the moment you need "my supper"
 * is the moment you are looking at the dish that belongs to it.
 *
 * Renaming and deleting hide behind an edit mode: a pencil and a cross on every
 * chip would triple the width of a row that is read far more often than edited.
 */
export default function DishTagChips({ dishTags, kind, id, small = false }) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [renamingId, setRenamingId] = useState(null);

  const assigned = dishTags.tagsFor(kind, id);

  const create = (label) => {
    const created = dishTags.createTag(label);
    if (created) dishTags.toggleTag(kind, id, created);
    setCreating(false);
  };

  const remove = (tag) => {
    if (window.confirm(t("dishTags.confirmDelete", { name: tag.label }))) {
      dishTags.deleteTag(tag.id);
    }
  };

  const leaveEditing = () => {
    setEditing(false);
    setRenamingId(null);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
      {dishTags.customTags.map((tag) => (renamingId === tag.id ? (
        <TagNameField
          key={tag.id}
          initial={tag.label}
          submitLabel={t("common.save")}
          small={small}
          onSubmit={(label) => {
            dishTags.renameTag(tag.id, label);
            setRenamingId(null);
          }}
          onCancel={() => setRenamingId(null)}
        />
      ) : (
        <span key={tag.id} style={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          <button type="button"
            title={editing ? t("dishTags.rename") : undefined}
            onClick={() => (editing
              ? setRenamingId(tag.id)
              : dishTags.toggleTag(kind, id, tag.id))}
            style={tagChipStyle(assigned.includes(tag.id), { small })}>
            {tag.label}
          </button>
          {editing && (
            <button type="button" title={t("common.delete")} onClick={() => remove(tag)}
              style={iconButtonStyle}>✕</button>
          )}
        </span>
      )))}

      {creating ? (
        <TagNameField
          initial=""
          submitLabel={t("dishTags.create")}
          small={small}
          onSubmit={create}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button type="button" data-tour="dishtags-new"
          onClick={() => { setCreating(true); leaveEditing(); }}
          style={{ ...tagChipStyle(false, { small }), borderStyle: "dashed", fontStyle: "italic" }}>
          {t("dishTags.new")}
        </button>
      )}

      {dishTags.customTags.length > 0 && (
        <>
          <button type="button" data-tour="dishtags-edit"
            onClick={() => (editing ? leaveEditing() : setEditing(true))}
            style={linkButtonStyle}>
            {editing ? t("dishTags.editDone") : t("dishTags.edit")}
          </button>
          {editing && (
            <span style={{ flexBasis: "100%", fontSize: 11, opacity: 0.5 }}>
              {t("dishTags.editHint")}
            </span>
          )}
        </>
      )}
    </div>
  );
}
