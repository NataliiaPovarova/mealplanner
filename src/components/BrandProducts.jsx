import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ingredientCatalog } from "../constants";
import { useUserData } from "../contexts/UserDataContext";
import {
  Field, Notice, Overlay,
  dangerButtonStyle, ghostButtonStyle, inputStyle, primaryButtonStyle, sectionTitleStyle,
} from "./ui";

/** Fields a supermarket label actually prints. Anything left blank keeps the USDA value. */
const LABEL_KEYS = ["kcal", "protein", "fat", "carbs", "fiber", "sugar", "sodium"];

const UNIT_BY_KEY = { kcal: "kcal", protein: "g", fat: "g", carbs: "g", fiber: "g", sugar: "g", sodium: "mg" };

const emptyDraft = () => ({
  ingredientId: "", brand: "", name: "",
  ...Object.fromEntries(LABEL_KEYS.map((key) => [key, ""])),
});

function draftFromProduct(product) {
  const draft = emptyDraft();
  draft.ingredientId = product.ingredientId || "";
  draft.brand = product.brand || "";
  draft.name = product.name || "";
  for (const key of LABEL_KEYS) {
    const value = product.per100g?.[key];
    if (value != null) draft[key] = String(value);
  }
  return draft;
}

function per100gFromDraft(draft) {
  const per100g = {};
  for (const key of LABEL_KEYS) {
    const raw = String(draft[key] ?? "").trim().replace(",", ".");
    if (raw === "") continue;
    const value = Number(raw);
    if (!Number.isNaN(value)) per100g[key] = value;
  }
  return per100g;
}

function ProductForm({ draft, setDraft, ingredientOptions, onSave, onCancel, busy, error }) {
  const { t } = useTranslation();
  const update = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <Overlay onClose={onCancel} maxWidth={520}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
        {t("products.formTitle")}
      </h2>
      <p style={{ fontSize: 13, opacity: 0.55, margin: "0 0 20px" }}>{t("products.formIntro")}</p>

      {error && <Notice tone="error">{error}</Notice>}

      <Field label={t("products.ingredient")} hint={t("products.ingredientHint")}>
        <select
          value={draft.ingredientId}
          onChange={(e) => update("ingredientId", e.target.value)}
          style={inputStyle}
        >
          <option value="">{t("products.pickIngredient")}</option>
          {ingredientOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
      </Field>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label={t("products.brand")}>
            <input value={draft.brand} onChange={(e) => update("brand", e.target.value)} style={inputStyle} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label={t("products.name")}>
            <input value={draft.name} onChange={(e) => update("name", e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>

      <h3 style={{ ...sectionTitleStyle, marginTop: 12 }}>{t("products.per100g")}</h3>
      <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 12px" }}>{t("products.per100gHint")}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
        {LABEL_KEYS.map((key) => (
          <Field key={key} label={`${t(`products.field.${key}`)}, ${t(`units.${UNIT_BY_KEY[key]}`)}`}>
            <input
              type="number" min="0" step="any" inputMode="decimal"
              value={draft[key]} onChange={(e) => update(key, e.target.value)} style={inputStyle}
            />
          </Field>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={onSave} disabled={busy} style={{ ...primaryButtonStyle, opacity: busy ? 0.6 : 1 }}>
          {busy ? t("common.saving") : t("common.save")}
        </button>
        <button onClick={onCancel} style={ghostButtonStyle}>{t("common.cancel")}</button>
      </div>
    </Overlay>
  );
}

export default function BrandProducts() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "en" ? "en" : "ru";
  const { products, ingredientDefaults, saveProduct, deleteProduct, setIngredientDefault } = useUserData();

  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const ingredientOptions = useMemo(() => (
    Object.entries(ingredientCatalog)
      // Reference ingredients point at other recipes, so a brand makes no sense there.
      .filter(([id]) => id !== "water" && !id.endsWith("-portion"))
      .map(([id, info]) => ({ id, name: info[lang] || info.ru || id }))
      .sort((a, b) => a.name.localeCompare(b.name, lang))
  ), [lang]);

  const ingredientName = (id) => ingredientCatalog[id]?.[lang] || ingredientCatalog[id]?.ru || id;

  const grouped = useMemo(() => {
    const byIngredient = new Map();
    for (const product of products) {
      const list = byIngredient.get(product.ingredientId) || [];
      list.push(product);
      byIngredient.set(product.ingredientId, list);
    }
    return [...byIngredient.entries()]
      .sort((a, b) => ingredientName(a[0]).localeCompare(ingredientName(b[0]), lang));
  }, [products, lang]);

  const startCreate = () => {
    setEditingId("new");
    setDraft(emptyDraft());
    setError(null);
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setDraft(draftFromProduct(product));
    setError(null);
  };

  const closeForm = () => {
    setEditingId(null);
    setDraft(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!draft.ingredientId) {
      setError(t("products.errorNoIngredient"));
      return;
    }
    const per100g = per100gFromDraft(draft);
    if (Object.keys(per100g).length === 0) {
      setError(t("products.errorNoNutrition"));
      return;
    }

    setBusy(true);
    try {
      await saveProduct(editingId === "new" ? null : editingId, {
        ingredientId: draft.ingredientId,
        brand: draft.brand.trim(),
        name: draft.name.trim(),
        per100g,
      });
      closeForm();
    } catch {
      setError(t("products.errorSave"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(t("products.confirmDelete"))) return;
    if (ingredientDefaults[product.ingredientId] === product.id) {
      await setIngredientDefault(product.ingredientId, null);
    }
    await deleteProduct(product.id);
  };

  const toggleDefault = (product) => {
    const isDefault = ingredientDefaults[product.ingredientId] === product.id;
    setIngredientDefault(product.ingredientId, isDefault ? null : product.id);
  };

  return (
    <div>
      <p style={{ fontSize: 14, marginBottom: 6, opacity: 0.7 }}>{t("products.intro")}</p>
      <p style={{ fontSize: 12.5, marginBottom: 18, opacity: 0.5 }}>{t("products.privacyNote")}</p>

      <button onClick={startCreate} style={{ ...primaryButtonStyle, marginBottom: 20 }}>
        {t("products.add")}
      </button>

      {products.length === 0 && (
        <p style={{ fontSize: 14, opacity: 0.5, fontStyle: "italic", textAlign: "center", padding: "24px 0" }}>
          {t("products.empty")}
        </p>
      )}

      {grouped.map(([ingredientId, list]) => (
        <div key={ingredientId} style={{ marginBottom: 22 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px", letterSpacing: "0.02em" }}>
            {ingredientName(ingredientId)}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {list.map((product) => {
              const isDefault = ingredientDefaults[ingredientId] === product.id;
              return (
                <div key={product.id} style={{
                  border: isDefault
                    ? "1.5px solid var(--text-color, #2d2a24)"
                    : "1px solid var(--border-color, #e0dcd4)",
                  borderRadius: 10, padding: "12px 14px",
                  background: "var(--bg-surface, rgba(255,252,247,0.6))",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                        {[product.brand, product.name].filter(Boolean).join(" · ")}
                      </div>
                      <div style={{ fontSize: 12.5, opacity: 0.6, marginTop: 3 }}>
                        {LABEL_KEYS
                          .filter((key) => product.per100g?.[key] != null)
                          .map((key) => `${t(`products.field.${key}`)} ${product.per100g[key]}${t(`units.${UNIT_BY_KEY[key]}`)}`)
                          .join(" · ")}
                      </div>
                    </div>
                    {isDefault && (
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20, flexShrink: 0,
                        background: "var(--text-color, #2d2a24)", color: "#fff",
                      }}>{t("products.defaultBadge")}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button onClick={() => toggleDefault(product)} style={{ ...ghostButtonStyle, padding: "5px 12px", fontSize: 12.5 }}>
                      {isDefault ? t("products.unsetDefault") : t("products.setDefault")}
                    </button>
                    <button onClick={() => startEdit(product)} style={{ ...ghostButtonStyle, padding: "5px 12px", fontSize: 12.5 }}>
                      {t("common.edit")}
                    </button>
                    <button onClick={() => handleDelete(product)} style={{ ...dangerButtonStyle, padding: "5px 12px", fontSize: 12.5 }}>
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {draft && (
        <ProductForm
          draft={draft} setDraft={setDraft} ingredientOptions={ingredientOptions}
          onSave={handleSave} onCancel={closeForm} busy={busy} error={error}
        />
      )}
    </div>
  );
}
