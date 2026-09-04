import { useEffect } from "react";

/** Shared inline styles for the forms added with user accounts. */

export const sectionTitleStyle = {
  fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em",
  opacity: 0.45, fontWeight: 600, margin: "24px 0 8px",
};

export const inputStyle = {
  width: "100%", boxSizing: "border-box",
  padding: "8px 10px", fontSize: 14, fontFamily: "inherit",
  color: "var(--text-color, #2d2a24)",
  background: "var(--bg-color, #fffdf8)",
  border: "1px solid var(--border-color, #d5d0c8)", borderRadius: 8,
};

export const labelStyle = {
  display: "block", fontSize: 12, opacity: 0.55,
  marginBottom: 4, letterSpacing: "0.02em",
};

export const primaryButtonStyle = {
  padding: "9px 18px", borderRadius: 8, fontSize: 14, fontFamily: "inherit",
  border: "1.5px solid var(--text-color, #2d2a24)",
  background: "var(--text-color, #2d2a24)", color: "#fff",
  fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s ease",
};

export const ghostButtonStyle = {
  padding: "9px 18px", borderRadius: 8, fontSize: 14, fontFamily: "inherit",
  border: "1px solid var(--border-color, #d5d0c8)",
  background: "transparent", color: "var(--text-color, #2d2a24)",
  cursor: "pointer", transition: "all 0.15s ease",
};

export const linkButtonStyle = {
  background: "none", border: "none", padding: 0,
  fontSize: 13, fontFamily: "inherit", cursor: "pointer",
  color: "var(--text-color-secondary, #8a8478)", textDecoration: "underline",
};

export const dangerButtonStyle = {
  ...ghostButtonStyle,
  borderColor: "#c47d7d", color: "#a85f5f",
};

export function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={labelStyle}>{label}</label>}
      {children}
      {hint && <div style={{ fontSize: 11, opacity: 0.45, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }) {
  if (!children) return null;
  const tones = {
    info: { background: "rgba(122,156,198,0.12)", color: "#4a6c94" },
    error: { background: "rgba(196,125,125,0.14)", color: "#a85f5f" },
    success: { background: "rgba(107,143,113,0.14)", color: "#4f7355" },
  };
  return (
    <div style={{
      ...tones[tone] || tones.info,
      padding: "9px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14,
    }}>{children}</div>
  );
}

export function Overlay({ onClose, maxWidth = 520, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-color, #fffdf8)", borderRadius: 12,
          maxWidth, width: "100%", maxHeight: "85vh", overflowY: "auto",
          padding: "28px 28px 22px", position: "relative",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          fontFamily: "'Georgia', 'Noto Serif', serif",
          color: "var(--text-color, #2d2a24)", lineHeight: 1.6,
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "sticky", top: 0, float: "right",
            background: "var(--bg-color, #fffdf8)", border: "none",
            fontSize: 22, cursor: "pointer", padding: "0 4px",
            color: "var(--text-color, #2d2a24)", opacity: 0.5, zIndex: 1,
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "0.5")}
        >✕</button>
        {children}
      </div>
    </div>
  );
}
