import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../contexts/UserDataContext";
import { buildExport, downloadJson, parseImport } from "../utils/userDataExport";
import {
  Notice, Overlay,
  dangerButtonStyle, ghostButtonStyle, primaryButtonStyle, sectionTitleStyle,
} from "./ui";

export default function AccountPanel({ onClose }) {
  const { t } = useTranslation();
  const { user, logOut } = useAuth();
  const { recipeOverlay, products, ingredientDefaults, plan, importData } = useUserData();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const ownCount = recipeOverlay.filter((entry) => !entry.baseId).length;
  const editedCount = recipeOverlay.filter((entry) => entry.baseId && !entry.deleted).length;
  const hiddenCount = recipeOverlay.filter((entry) => entry.deleted).length;

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(
      buildExport({ recipeOverlay, products, ingredientDefaults, plan }),
      `mealplanner-${stamp}.json`,
    );
    setStatus({ tone: "success", text: t("account.exportDone") });
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm(t("account.confirmImport"))) return;

    setBusy(true);
    setStatus(null);
    try {
      const payload = parseImport(await file.text());
      await importData(payload);
      setStatus({ tone: "success", text: t("account.importDone") });
    } catch (error) {
      const key = {
        "unrecognized-format": "account.errorFormat",
        "unsupported-version": "account.errorVersion",
        "import-too-large": "account.errorTooLarge",
      }[error?.message] || "account.errorImport";
      setStatus({ tone: "error", text: t(key) });
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await logOut();
    onClose();
  };

  return (
    <Overlay onClose={onClose} maxWidth={460}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
        {t("account.title")}
      </h2>
      <p style={{ fontSize: 13, opacity: 0.6, margin: "0 0 18px", wordBreak: "break-all" }}>{user?.email}</p>

      {status && <Notice tone={status.tone}>{status.text}</Notice>}

      <div style={{ fontSize: 13.5, lineHeight: 1.9, opacity: 0.8 }}>
        <div>{t("account.ownRecipes", { count: ownCount })}</div>
        <div>{t("account.editedRecipes", { count: editedCount })}</div>
        <div>{t("account.hiddenRecipes", { count: hiddenCount })}</div>
        <div>{t("account.products", { count: products.length })}</div>
      </div>

      <h3 style={sectionTitleStyle}>{t("account.backupTitle")}</h3>
      <p style={{ fontSize: 12.5, opacity: 0.55, margin: "0 0 12px", lineHeight: 1.6 }}>
        {t("account.backupNote")}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={handleExport} style={primaryButtonStyle}>{t("account.export")}</button>
        <button onClick={() => fileInputRef.current?.click()} disabled={busy}
          style={{ ...ghostButtonStyle, opacity: busy ? 0.6 : 1 }}>
          {busy ? t("account.importing") : t("account.import")}
        </button>
        <input ref={fileInputRef} type="file" accept="application/json,.json"
          onChange={handleImportFile} style={{ display: "none" }} />
      </div>

      <h3 style={sectionTitleStyle}>{t("account.sessionTitle")}</h3>
      <button onClick={handleSignOut} style={dangerButtonStyle}>{t("account.signOut")}</button>
    </Overlay>
  );
}
