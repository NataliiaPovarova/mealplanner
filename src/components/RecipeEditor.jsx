import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ingredientCatalog } from "../constants";
import { useUserData } from "../contexts/UserDataContext";
import { computeRecipeNutrition } from "../utils/computeNutrition";
import { brandOverridesFor } from "../utils/userRecipes";
import {
  Field, Notice, Overlay,
  dangerButtonStyle, ghostButtonStyle, inputStyle, labelStyle, primaryButtonStyle, sectionTitleStyle,
} from "./ui";

/** Units the nutrition engine can convert reliably for any ingredient. */
const UNITS = ["g", "ml", "pcs"];

const SLOT_TAGS = ["breakfast-dinner", "lunch", "snack", "add-on"];

function draftFromMeal(meal) {
  return {
    emoji: meal?.emoji || "🍽️",
    name: meal?.name || "",
    description: meal?.description || "",
    portions: String(meal?.portions ?? 2),
    batchDays: String(meal?.batchDays ?? 1),
    prepMinutes: String(meal?.prepMinutes ?? 10),
    cookMinutes: String(meal?.cookMinutes ?? 0),
    tags: meal?.tags ? [...meal.tags] : [],
    ingredients: meal?.ingredients?.length
      ? meal.ingredients.map((ing) => ({
        id: ing.id,
        amount: String(ing.amount ?? ""),
        unit: ing.unit || "g",
        note: ing.note || "",
        optional: Boolean(ing.optional),
      }))
      : [{ id: "", amount: "", unit: "g", note: "", optional: false }],
    steps: (meal?.steps || []).join("\n"),
    tips: meal?.tips || "",
    freshAdd: meal?.freshAdd || "",
  };
}

function toIngredients(draft) {
  return draft.ingredients
    .filter((row) => row.id && String(row.amount).trim() !== "")
    .map((row) => {
      const ingredient = {
        id: row.id,
        amount: Number(String(row.amount).replace(",", ".")) || 0,
        unit: row.unit,
      };
      if (row.note.trim()) ingredient.note = row.note.trim();
      if (row.optional) ingredient.optional = true;
      return ingredient;
    });
}

export default function RecipeEditor({ meal, meals, onClose, onSaved }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "ru";
  const {
    products, ingredientDefaults, recipeOverlay,
    saveOwnRecipe, saveBaseOverride, hideBaseRecipe, removeRecipeOverlay,
  } = useUserData();

  const [draft, setDraft] = useState(() => draftFromMeal(meal));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isNew = !meal;
  const isBaseRecipe = Boolean(meal && !meal.isUserRecipe);
  const hasOverlay = Boolean(meal && recipeOverlay.some((entry) => entry.id === meal.id));

  const update = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const ingredientOptions = useMemo(() => (
    Object.entries(ingredientCatalog)
      .map(([id, info]) => ({ id, name: info[lang] || info.ru || id }))
      .sort((a, b) => a.name.localeCompare(b.name, lang))
  ), [lang]);

  const allTags = useMemo(() => {
    const tags = new Set(SLOT_TAGS);
    for (const item of meals) for (const tag of item.tags || []) tags.add(tag);
    return [
      ...SLOT_TAGS,
      ...[...tags].filter((tag) => !SLOT_TAGS.includes(tag)).sort(),
    ];
  }, [meals]);

  const overrides = useMemo(
    () => brandOverridesFor(products, ingredientDefaults),
    [products, ingredientDefaults],
  );

  const preview = useMemo(() => computeRecipeNutrition(
    { ingredients: toIngredients(draft), portions: Number(draft.portions) || 1 },
    {
      overrides,
      resolveReference: (id) => {
        const referenced = meals.find((item) => item.id === id);
        return referenced
          ? { perPortion: referenced.perPortion, perPortionNutrients: referenced.perPortionNutrients }
          : null;
      },
    },
  ), [draft, overrides, meals]);

  const setIngredientRow = (index, patch) => setDraft((prev) => ({
    ...prev,
    ingredients: prev.ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  }));

  const addIngredientRow = () => setDraft((prev) => ({
    ...prev,
    ingredients: [...prev.ingredients, { id: "", amount: "", unit: "g", note: "", optional: false }],
  }));

  const removeIngredientRow = (index) => setDraft((prev) => ({
    ...prev,
    ingredients: prev.ingredients.filter((_, i) => i !== index),
  }));

  const toggleTag = (tag) => setDraft((prev) => ({
    ...prev,
    tags: prev.tags.includes(tag) ? prev.tags.filter((item) => item !== tag) : [...prev.tags, tag],
  }));

  const buildPayload = () => {
    const existing = recipeOverlay.find((entry) => entry.id === meal?.id);
    const text = { ...(existing?.text || {}) };
    text[lang] = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      steps: draft.steps.split("\n").map((line) => line.trim()).filter(Boolean),
      tips: draft.tips.trim(),
      freshAdd: draft.freshAdd.trim(),
    };

    return {
      emoji: draft.emoji || "🍽️",
      type: meal?.type || "custom",
      tags: draft.tags,
      portions: Number(draft.portions) || 1,
      batchDays: Number(draft.batchDays) || 1,
      prepMinutes: Number(draft.prepMinutes) || 0,
      cookMinutes: Number(draft.cookMinutes) || 0,
      ingredients: toIngredients(draft),
      text,
    };
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setError(t("editor.errorNoName"));
      return;
    }
    if (toIngredients(draft).length === 0) {
      setError(t("editor.errorNoIngredients"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const payload = buildPayload();
      if (isBaseRecipe) await saveBaseOverride(meal.id, payload);
      else await saveOwnRecipe(isNew ? null : meal.id, payload);
      onSaved?.();
      onClose();
    } catch {
      setError(t("editor.errorSave"));
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("editor.confirmDelete"))) return;
    setBusy(true);
    try {
      if (isBaseRecipe) await hideBaseRecipe(meal.id);
      else await removeRecipeOverlay(meal.id);
      onSaved?.();
      onClose();
    } catch {
      setError(t("editor.errorSave"));
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    if (!window.confirm(t("editor.confirmRevert"))) return;
    setBusy(true);
    try {
      await removeRecipeOverlay(meal.id);
      onSaved?.();
      onClose();
    } catch {
      setError(t("editor.errorSave"));
      setBusy(false);
    }
  };

  const hasSlotTag = draft.tags.some((tag) => SLOT_TAGS.includes(tag));

  return (
    <Overlay onClose={onClose} maxWidth={640}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
        {isNew ? t("editor.createTitle") : t("editor.editTitle")}
      </h2>
      <p style={{ fontSize: 13, opacity: 0.55, margin: "0 0 18px" }}>
        {isBaseRecipe ? t("editor.baseIntro") : t("editor.ownIntro")}
      </p>

      {error && <Notice tone="error">{error}</Notice>}
      {!hasSlotTag && <Notice tone="info">{t("editor.noSlotTagWarning")}</Notice>}

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 70 }}>
          <Field label={t("editor.emoji")}>
            <input value={draft.emoji} onChange={(e) => update("emoji", e.target.value)}
              style={{ ...inputStyle, textAlign: "center", fontSize: 20 }} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label={t("editor.name")}>
            <input value={draft.name} onChange={(e) => update("name", e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>

      <Field label={t("editor.description")}>
        <input value={draft.description} onChange={(e) => update("description", e.target.value)} style={inputStyle} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
        <Field label={t("editor.portions")}>
          <input type="number" min="1" step="1" value={draft.portions}
            onChange={(e) => update("portions", e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t("editor.batchDays")}>
          <input type="number" min="1" step="1" value={draft.batchDays}
            onChange={(e) => update("batchDays", e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t("editor.prepMinutes")}>
          <input type="number" min="0" step="1" value={draft.prepMinutes}
            onChange={(e) => update("prepMinutes", e.target.value)} style={inputStyle} />
        </Field>
        <Field label={t("editor.cookMinutes")}>
          <input type="number" min="0" step="1" value={draft.cookMinutes}
            onChange={(e) => update("cookMinutes", e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <h3 style={sectionTitleStyle}>{t("editor.tags")}</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {allTags.map((tag) => {
          const isActive = draft.tags.includes(tag);
          return (
            <button key={tag} type="button" onClick={() => toggleTag(tag)} style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 20,
              border: isActive ? "1.5px solid var(--text-color, #2d2a24)" : "1px solid var(--border-color, #d5d0c8)",
              background: isActive ? "var(--text-color, #2d2a24)" : "transparent",
              color: isActive ? "var(--bg-color, #fffcf7)" : "var(--text-color-secondary, #6b6560)",
              cursor: "pointer", fontFamily: "inherit", fontWeight: isActive ? 600 : 400,
            }}>{t(`tags.${tag}`, { defaultValue: tag })}</button>
          );
        })}
      </div>

      <h3 style={sectionTitleStyle}>{t("editor.ingredients")}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {draft.ingredients.map((row, index) => (
          <div key={index} style={{
            border: "1px solid var(--border-color, #e0dcd4)", borderRadius: 8, padding: "10px 12px",
          }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: "2 1 190px" }}>
                <label style={labelStyle}>{t("editor.ingredient")}</label>
                <select value={row.id} onChange={(e) => setIngredientRow(index, { id: e.target.value })} style={inputStyle}>
                  <option value="">{t("editor.pickIngredient")}</option>
                  {ingredientOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "0 1 90px" }}>
                <label style={labelStyle}>{t("editor.amount")}</label>
                <input type="number" min="0" step="any" inputMode="decimal" value={row.amount}
                  onChange={(e) => setIngredientRow(index, { amount: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: "0 1 90px" }}>
                <label style={labelStyle}>{t("editor.unit")}</label>
                <select value={row.unit} onChange={(e) => setIngredientRow(index, { unit: e.target.value })} style={inputStyle}>
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>{t(`units.${unit}`)}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={() => removeIngredientRow(index)}
                style={{ ...ghostButtonStyle, padding: "8px 12px", fontSize: 13 }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input value={row.note} placeholder={t("editor.notePlaceholder")}
                onChange={(e) => setIngredientRow(index, { note: e.target.value })}
                style={{ ...inputStyle, flex: "1 1 200px" }} />
              <label style={{ fontSize: 12.5, opacity: 0.7, display: "flex", alignItems: "center", gap: 6 }}>
                <input type="checkbox" checked={row.optional}
                  onChange={(e) => setIngredientRow(index, { optional: e.target.checked })} />
                {t("recipe.optional")}
              </label>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addIngredientRow} style={{ ...ghostButtonStyle, marginTop: 10, padding: "6px 14px", fontSize: 13 }}>
        {t("editor.addIngredient")}
      </button>

      <h3 style={sectionTitleStyle}>{t("editor.previewTitle")}</h3>
      <div style={{
        display: "flex", gap: 0, borderRadius: 8, overflow: "hidden",
        fontSize: 11, fontWeight: 500, marginBottom: 8,
      }}>
        {[
          { label: `${preview.perPortion.kcal} ${t("recipe.kcal")}`, color: "#6b8f71", flex: 3 },
          { label: `${t("recipe.protein")} ${preview.perPortion.protein}${t("units.g")}`, color: "#7a9cc6", flex: 2 },
          { label: `${t("recipe.fat")} ${preview.perPortion.fat}${t("units.g")}`, color: "#d4a76a", flex: 1.2 },
          { label: `${t("recipe.carbs")} ${preview.perPortion.carbs}${t("units.g")}`, color: "#c47d7d", flex: 2.5 },
          { label: `${t("recipe.fiber")} ${preview.perPortion.fiber}${t("units.g")}`, color: "#9b8ec4", flex: 1.5 },
        ].map((segment, i) => (
          <div key={i} style={{
            flex: segment.flex, background: segment.color, color: "#fff",
            padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap",
          }}>{segment.label}</div>
        ))}
      </div>
      {preview.warnings.length > 0 && (
        <Notice tone="info">
          {t("editor.previewWarnings")}
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {preview.warnings.map((warning, i) => (
              <li key={i} style={{ fontSize: 12.5 }}>
                {ingredientCatalog[warning.ingredientId]?.[lang] || warning.ingredientId}
                {" — "}
                {t(`editor.warning.${warning.reason}`)}
              </li>
            ))}
          </ul>
        </Notice>
      )}

      <h3 style={sectionTitleStyle}>{t("editor.steps")}</h3>
      <Field hint={t("editor.stepsHint")}>
        <textarea value={draft.steps} rows={6} onChange={(e) => update("steps", e.target.value)}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
      </Field>

      <Field label={t("recipe.tips")}>
        <textarea value={draft.tips} rows={2} onChange={(e) => update("tips", e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }} />
      </Field>

      <Field label={t("recipe.freshAdd")}>
        <input value={draft.freshAdd} onChange={(e) => update("freshAdd", e.target.value)} style={inputStyle} />
      </Field>

      <p style={{ fontSize: 11.5, opacity: 0.45, margin: "4px 0 16px", lineHeight: 1.5 }}>
        {t("editor.languageNote", { lang: t(`editor.lang.${lang}`) })}
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={handleSave} disabled={busy} style={{ ...primaryButtonStyle, opacity: busy ? 0.6 : 1 }}>
          {busy ? t("common.saving") : t("common.save")}
        </button>
        <button onClick={onClose} style={ghostButtonStyle}>{t("common.cancel")}</button>
        {isBaseRecipe && hasOverlay && (
          <button onClick={handleRevert} style={ghostButtonStyle}>{t("editor.revert")}</button>
        )}
        {!isNew && (
          <button onClick={handleDelete} style={dangerButtonStyle}>
            {isBaseRecipe ? t("editor.hide") : t("common.delete")}
          </button>
        )}
      </div>
    </Overlay>
  );
}
