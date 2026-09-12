import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTour } from "./TourContext";

/** Above the overlays (z-index 1000), which is where half of the anchors live. */
const LAYER_Z = 1100;
const MAX_WIDTH = 290;
const GAP = 12;
const MARGIN = 12;
const ARROW = 10;

const ACCENT = "#d4a76a";

/**
 * The layer never swallows a click. Only the bubble itself takes pointer events,
 * so the highlighted button stays a real button — which it has to be, because
 * the tour advances by watching the user press it.
 */
const layerStyle = {
  position: "fixed", inset: 0, zIndex: LAYER_Z, pointerEvents: "none",
};

function sameRect(a, b) {
  return Boolean(a) && a.top === b.top && a.left === b.left
    && a.width === b.width && a.height === b.height;
}

/** Bubble beside the anchor, flipped to the other side when it would not fit. */
function place(rect, size, placement) {
  const { innerWidth: vw, innerHeight: vh } = window;
  const clamp = (value, extent, max) => Math.max(MARGIN, Math.min(value, max - extent - MARGIN));
  const fitsLeft = rect.left - GAP - size.width >= MARGIN;
  const fitsRight = rect.right + GAP + size.width <= vw - MARGIN;
  let side = placement;

  // A side with no room flips to its opposite; a horizontal one with no room
  // either way drops below the anchor, where the viewport is always widest.
  if (side === "left" && !fitsLeft) side = fitsRight ? "right" : "bottom";
  else if (side === "right" && !fitsRight) side = fitsLeft ? "left" : "bottom";

  if (side === "bottom" && rect.bottom + GAP + size.height > vh - MARGIN
    && rect.top - GAP - size.height > MARGIN) side = "top";
  else if (side === "top" && rect.top - GAP - size.height < MARGIN) side = "bottom";

  const horizontal = side === "left" || side === "right";
  const rawLeft = horizontal
    ? (side === "left" ? rect.left - GAP - size.width : rect.right + GAP)
    : rect.left + rect.width / 2 - size.width / 2;
  const rawTop = horizontal
    ? rect.top + rect.height / 2 - size.height / 2
    : (side === "top" ? rect.top - GAP - size.height : rect.bottom + GAP);

  const left = clamp(rawLeft, size.width, vw);
  const top = clamp(rawTop, size.height, vh);

  // The arrow chases the anchor's midpoint, stopping short of the rounded corners.
  const along = horizontal
    ? rect.top + rect.height / 2 - top
    : rect.left + rect.width / 2 - left;
  const limit = (horizontal ? size.height : size.width) - ARROW * 2 - 8;
  const arrow = Math.max(14, Math.min(along - ARROW / 2, limit));

  return { side, left: Math.round(left), top: Math.round(top), arrow: Math.round(arrow) };
}

function arrowStyle(side, offset) {
  const base = {
    position: "absolute", width: ARROW, height: ARROW,
    background: "var(--bg-color, #fffdf8)", transform: "rotate(45deg)",
    borderColor: "var(--border-color, #d5d0c8)", borderStyle: "solid", borderWidth: 0,
  };
  if (side === "bottom") {
    return { ...base, top: -ARROW / 2, left: offset, borderTopWidth: 1, borderLeftWidth: 1 };
  }
  if (side === "top") {
    return { ...base, bottom: -ARROW / 2, left: offset, borderBottomWidth: 1, borderRightWidth: 1 };
  }
  if (side === "left") {
    return { ...base, right: -ARROW / 2, top: offset, borderTopWidth: 1, borderRightWidth: 1 };
  }
  return { ...base, left: -ARROW / 2, top: offset, borderBottomWidth: 1, borderLeftWidth: 1 };
}

export default function TourBubble() {
  const { t } = useTranslation();
  const { tourId, step, target, stepNumber, stepCount, next, skip } = useTour();
  const bubbleRef = useRef(null);
  const [rect, setRect] = useState(null);
  const [size, setSize] = useState({ width: MAX_WIDTH, height: 140 });

  useEffect(() => {
    if (!target) {
      setRect(null);
      return undefined;
    }

    const update = () => setRect((prev) => {
      const measured = target.getBoundingClientRect();
      return sameRect(prev, measured) ? prev : measured;
    });

    update();

    // Scroll only when the anchor is out of reach: an anchor already in view must
    // not jump, and centring a tall one (the whole option list) would push its own
    // top off screen.
    const box = target.getBoundingClientRect();
    if (box.top < MARGIN || box.bottom > window.innerHeight - MARGIN) {
      target.scrollIntoView({
        block: box.height > window.innerHeight / 2 ? "nearest" : "center",
        inline: "nearest",
        behavior: "smooth",
      });
    }

    // Capture phase, so scrolling inside the picker counts too. The poll is the
    // safety net for anchors moved by a neighbour resizing, which fires nothing.
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(target);
    const timer = setInterval(update, 100);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      observer.disconnect();
      clearInterval(timer);
    };
  }, [target]);

  useLayoutEffect(() => {
    const node = bubbleRef.current;
    if (!node) return;
    const measured = { width: node.offsetWidth, height: node.offsetHeight };
    if (measured.width !== size.width || measured.height !== size.height) setSize(measured);
  });

  if (!step || !rect) return null;

  const { side, left, top, arrow } = place(rect, size, step.placement || "bottom");
  const last = stepNumber >= stepCount;
  // A one-step tour has no progress to report and nothing to skip ahead of.
  const solo = stepCount === 1;
  const width = Math.min(MAX_WIDTH, window.innerWidth - MARGIN * 2);

  return (
    <div style={layerStyle}>
      <div style={{
        position: "fixed",
        top: rect.top - 4, left: rect.left - 4,
        width: rect.width + 8, height: rect.height + 8,
        borderRadius: 10, border: `2px solid ${ACCENT}`,
        boxShadow: `0 0 0 4px rgba(212,167,106,0.22)`,
        pointerEvents: "none", transition: "all 0.18s ease",
      }} />

      <div
        ref={bubbleRef}
        style={{
          position: "fixed", top, left, width,
          pointerEvents: "auto", boxSizing: "border-box",
          background: "var(--bg-color, #fffdf8)",
          border: "1px solid var(--border-color, #d5d0c8)", borderRadius: 10,
          boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
          padding: "14px 16px 12px",
          fontFamily: "'Georgia', 'Noto Serif', serif",
          color: "var(--text-color, #2d2a24)", lineHeight: 1.55,
        }}
      >
        <div style={arrowStyle(side, arrow)} />

        {!solo && (
          <div style={{
            fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em",
            opacity: 0.4, fontWeight: 600, marginBottom: 6,
          }}>
            {t("tour.step", { current: stepNumber, total: stepCount })}
          </div>
        )}

        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 5 }}>
          {t(`tour.${tourId}.${step.id}.title`)}
        </div>
        <p style={{ fontSize: 13, margin: 0, opacity: 0.8 }}>
          {t(`tour.${tourId}.${step.id}.body`)}
        </p>

        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: solo ? "flex-end" : "space-between",
          gap: 10, marginTop: 12,
        }}>
          {!solo && (
            <button type="button" onClick={skip} style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, textDecoration: "underline",
              color: "var(--text-color-secondary, #8a8478)",
            }}>{t("tour.skip")}</button>
          )}
          <button type="button" onClick={next} style={{
            padding: "6px 16px", borderRadius: 20, fontSize: 13, fontFamily: "inherit",
            border: "1.5px solid var(--text-color, #2d2a24)",
            background: "var(--text-color, #2d2a24)", color: "#fff",
            fontWeight: 600, cursor: "pointer",
          }}>{last ? t("tour.done") : t("tour.next")}</button>
        </div>
      </div>
    </div>
  );
}
