import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  newCustomIngredientId,
  tagsInGroup,
} from "../constants";
import { useUserData } from "../contexts/UserDataContext";
import { labelFromPer100g, per100gFromLabel } from "../utils/nutrition";
import { ROLE_ADDON, ROLE_DISH } from "../utils/planEntries";
import TagFilterBar from "./TagFilterBar";
import {
  Field, Notice, NutritionLabelFields, Overlay,
  ghostButtonStyle, inputStyle, labelStyle, primaryButtonStyle, sectionTitleStyle,
} from "./ui";

const ROLES = [ROLE_DISH, ROLE_ADDON];
const DEFAULT_AMOUNT = { [ROLE_DISH]: "150", [ROLE_ADDON]: "50" };

/** What an ingredient is made of is a `food` tag; the other groups describe dishes. */
const INGREDIENT_TAG_GROUP = "food";

function emptyIngredientDraft() {
  return {
    ru: "",
    en: "",
    category: INGREDIENT_CATEGORIES[0],
    tags: [],
    roles: [...ROLES],
    amounts: { ...DEFAULT_AMOUNT },
    unit: INGREDIENT_UNITS[0],
    nutrition: labelFromPer100g(null),
  };
}

function draftFromIngredient(info) {
  return {
    ru: info?.ru || "",
    en: info?.en || "",
    category: info?.category || INGREDIENT_CATEGORIES[0],
    tags: [...(info?.tags || [])],
    roles: [...(info?.roles || [])],
    amounts: {
      [ROLE_DISH]: String(info?.portion?.dish ?? DEFAULT_AMOUNT[ROLE_DISH]),
      [ROLE_ADDON]: String(info?.portion?.addon ?? DEFAULT_AMOUNT[ROLE_ADDON]),
    },
    unit: info?.portion?.unit || INGREDIENT_UNITS[0],
    nutrition: labelFromPer100g(info?.per100g),
  };
}

const amountOf = (draft, role) => Number(String(draft.amounts[role]).replace(",", "."));

/**
 * Creating a product the catalog never had — beetroot, a local bakery loaf — and
 * editing one afterwards. Nutrition is optional on purpose: there is no USDA row
 * to fall back on, and a product you eat is worth planning even without numbers.
 *
 * Saving happens here so the three places that open the form (the products tab,
 * the dish picker, the recipe editor) only have to say what to do with the id.
 */
export default function CustomIngredientForm({ id = null, info = null, onSaved, onClose }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "ru";
  const otherLang = lang === "ru" ? "en" : "ru";
  const { saveCustomIngredient } = useUserData();

  const [draft, setDraft] = useState(() => (info ? draftFromIngredient(info) : emptyIngredientDraft()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const update = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const toggleRole = (role) => setDraft((prev) => ({
    ...prev,
    roles: prev.roles.includes(role)
      ? prev.roles.filter((item) => item !== role)
      : [...prev.roles, role],
  }));

  const setAmount = (role, value) => setDraft((prev) => ({
    ...prev,
    amounts: { ...prev.amounts, [role]: value },
  }));

  const toggleTag = (tag) => setDraft((prev) => ({
    ...prev,
    tags: prev.tags.includes(tag) ? prev.tags.filter((item) => item !== tag) : [...prev.tags, tag],
  }));

  const setNutrition = (key, value) => setDraft((prev) => ({
    ...prev,
    nutrition: { ...prev.nutrition, [key]: value },
  }));

  const buildPayload = () => {
    const payload = {
      category: draft.category,
      tags: draft.tags,
      roles: draft.roles,
      portion: { unit: draft.unit },
    };
    // Firestore rejects undefined, and a name left blank in one language must be
    // absent rather than empty so `ingredientName` falls through to the other.
    for (const key of ["ru", "en"]) {
      const name = draft[key].trim();
      if (name) payload[key] = name;
    }
    for (const role of draft.roles) payload.portion[role] = amountOf(draft, role);

    const per100g = per100gFromLabel(draft.nutrition);
    if (Object.keys(per100g).length) payload.per100g = per100g;
    return payload;
  };

  const handleSave = async () => {
    if (!draft.ru.trim() && !draft.en.trim()) {
      setError(t("myIngredients.errorNoName"));
      return;
    }
    if (!draft.roles.length) {
      setError(t("myIngredients.errorNoRole"));
      return;
    }
    if (draft.roles.some((role) => !(amountOf(draft, role) > 0))) {
      setError(t("myIngredients.errorNoAmount"));
      return;
    }

    setBusy(true);
    setError(null);
    const ingredientId = id || newCustomIngredientId();
    try {
      await saveCustomIngredient(ingredientId, buildPayload());
      onSaved?.(ingredientId);
      onClose();
    } catch {
      setError(t("myIngredients.errorSave"));
      setBusy(false);
    }
  };

  return (
    <Overlay onClose={onClose} maxWidth={560}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
        {id ? t("myIngredients.editTitle") : t("myIngredients.createTitle")}
      </h2>
      <p style={{ fontSize: 13, opacity: 0.55, margin: "0 0 20px" }}>{t("myIngredients.formIntro")}</p>

      {error && <Notice tone="error">{error}</Notice>}

      <Field label={t("myIngredients.nameIn", { lang: t(`editor.lang.${lang}`) })}>
        <input autoFocus value={draft[lang]} onChange={(e) => update(lang, e.target.value)} style={inputStyle} />
      </Field>
      <Field
        label={t("myIngredients.nameIn", { lang: t(`editor.lang.${otherLang}`) })}
        hint={t("myIngredients.nameOtherHint")}
      >
        <input value={draft[otherLang]} onChange={(e) => update(otherLang, e.target.value)} style={inputStyle} />
      </Field>

      <Field label={t("myIngredients.category")} hint={t("myIngredients.categoryHint")}>
        <select value={draft.category} onChange={(e) => update("category", e.target.value)} style={inputStyle}>
          {INGREDIENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>{t(`category.${category}`)}</option>
          ))}
        </select>
      </Field>

      <h3 style={sectionTitleStyle}>{t("myIngredients.tags")}</h3>
      <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 8px" }}>{t("myIngredients.tagsHint")}</p>
      <TagFilterBar
        tags={tagsInGroup(INGREDIENT_TAG_GROUP)}
        active={draft.tags}
        onToggle={toggleTag}
        groups={[INGREDIENT_TAG_GROUP]}
        small
      />

      <h3 style={sectionTitleStyle}>{t("myIngredients.roles")}</h3>
      <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 10px" }}>{t("myIngredients.rolesHint")}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ROLES.map((role) => (
          <div key={role} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, flex: "1 1 190px" }}>
              <input type="checkbox" checked={draft.roles.includes(role)} onChange={() => toggleRole(role)} />
              {t(`myIngredients.role.${role}`)}
            </label>
            <input
              type="number" min="1" step="any" inputMode="decimal"
              value={draft.amounts[role]}
              disabled={!draft.roles.includes(role)}
              aria-label={t("myIngredients.defaultAmount")}
              onChange={(e) => setAmount(role, e.target.value)}
              style={{ ...inputStyle, width: 90, opacity: draft.roles.includes(role) ? 1 : 0.4 }}
            />
            <span style={{ fontSize: 12.5, opacity: 0.55 }}>{t(`units.${draft.unit}`)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, maxWidth: 160 }}>
        <label style={labelStyle}>{t("myIngredients.unit")}</label>
        <select value={draft.unit} onChange={(e) => update("unit", e.target.value)} style={inputStyle}>
          {INGREDIENT_UNITS.map((unit) => (
            <option key={unit} value={unit}>{t(`units.${unit}`)}</option>
          ))}
        </select>
      </div>

      <h3 style={{ ...sectionTitleStyle, marginTop: 20 }}>{t("myIngredients.nutrition")}</h3>
      <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 12px" }}>{t("myIngredients.nutritionHint")}</p>
      <NutritionLabelFields values={draft.nutrition} onChange={setNutrition} />

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={handleSave} disabled={busy} style={{ ...primaryButtonStyle, opacity: busy ? 0.6 : 1 }}>
          {busy ? t("common.saving") : t("common.save")}
        </button>
        <button onClick={onClose} style={ghostButtonStyle}>{t("common.cancel")}</button>
      </div>
    </Overlay>
  );
}
