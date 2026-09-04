import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { authErrorKey } from "../utils/authErrors";
import { Field, Notice, Overlay, inputStyle, linkButtonStyle, primaryButtonStyle } from "./ui";

export default function AuthPanel({ onClose }) {
  const { t } = useTranslation();
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setSent(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (mode === "signUp" && password !== confirm) {
      setError(t("auth.errorPasswordMismatch"));
      return;
    }

    setBusy(true);
    try {
      if (mode === "signIn") {
        await signIn(email.trim(), password);
        onClose();
      } else if (mode === "signUp") {
        await signUp(email.trim(), password);
        onClose();
      } else {
        await resetPassword(email.trim());
        setSent(true);
      }
    } catch (err) {
      setError(t(authErrorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const title = {
    signIn: t("auth.signInTitle"),
    signUp: t("auth.signUpTitle"),
    reset: t("auth.resetTitle"),
  }[mode];

  const submitLabel = {
    signIn: t("auth.signInAction"),
    signUp: t("auth.signUpAction"),
    reset: t("auth.resetAction"),
  }[mode];

  return (
    <Overlay onClose={onClose} maxWidth={420}>
      <h2 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>{title}</h2>
      <p style={{ fontSize: 13, opacity: 0.55, margin: "0 0 20px" }}>{t("auth.intro")}</p>

      {error && <Notice tone="error">{error}</Notice>}
      {sent && <Notice tone="success">{t("auth.resetSent")}</Notice>}

      <form onSubmit={handleSubmit}>
        <Field label={t("auth.email")}>
          <input
            type="email" value={email} required autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} style={inputStyle}
          />
        </Field>

        {mode !== "reset" && (
          <Field label={t("auth.password")} hint={mode === "signUp" ? t("auth.passwordHint") : null}>
            <input
              type="password" value={password} required minLength={6}
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              onChange={(e) => setPassword(e.target.value)} style={inputStyle}
            />
          </Field>
        )}

        {mode === "signUp" && (
          <Field label={t("auth.confirmPassword")}>
            <input
              type="password" value={confirm} required minLength={6} autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)} style={inputStyle}
            />
          </Field>
        )}

        <button
          type="submit" disabled={busy}
          style={{ ...primaryButtonStyle, width: "100%", opacity: busy ? 0.6 : 1, marginTop: 4 }}
        >{busy ? t("auth.busy") : submitLabel}</button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18, alignItems: "flex-start" }}>
        {mode !== "signIn" && (
          <button type="button" style={linkButtonStyle} onClick={() => switchMode("signIn")}>
            {t("auth.toSignIn")}
          </button>
        )}
        {mode !== "signUp" && (
          <button type="button" style={linkButtonStyle} onClick={() => switchMode("signUp")}>
            {t("auth.toSignUp")}
          </button>
        )}
        {mode !== "reset" && (
          <button type="button" style={linkButtonStyle} onClick={() => switchMode("reset")}>
            {t("auth.toReset")}
          </button>
        )}
      </div>

      <p style={{ fontSize: 11, opacity: 0.45, margin: "20px 0 0", lineHeight: 1.5 }}>
        {t("auth.privacyNote")}
      </p>
    </Overlay>
  );
}
