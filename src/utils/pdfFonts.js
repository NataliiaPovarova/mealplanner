import { jsPDF } from "jspdf";

const FONT_URLS = {
  regular:
    "https://cdn.jsdelivr.net/gh/googlefonts/roboto-2@main/src/hinted/Roboto-Regular.ttf",
  bold: "https://cdn.jsdelivr.net/gh/googlefonts/roboto-2@main/src/hinted/Roboto-Bold.ttf",
};

const fontCache = { regular: null, bold: null };

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    const chunk = bytes.subarray(i, Math.min(i + 8192, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

export async function ensureFonts() {
  if (fontCache.regular && fontCache.bold) return fontCache;
  try {
    const [regular, bold] = await Promise.all(
      ["regular", "bold"].map(async (style) => {
        if (fontCache[style]) return fontCache[style];
        const res = await fetch(FONT_URLS[style]);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return arrayBufferToBase64(await res.arrayBuffer());
      })
    );
    fontCache.regular = regular;
    fontCache.bold = bold;
    return fontCache;
  } catch {
    return null;
  }
}

export function tryRegisterFonts(doc, fonts) {
  doc.addFileToVFS("Roboto-Regular.ttf", fonts.regular);
  doc.addFileToVFS("Roboto-Bold.ttf", fonts.bold);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto", "normal");
  doc.getTextWidth("test");
  doc.setFont("Roboto", "bold");
  doc.getTextWidth("test");
}

export async function initPdfDoc() {
  const fonts = await ensureFonts();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let fontName = "helvetica";

  if (fonts) {
    try {
      tryRegisterFonts(doc, fonts);
      fontName = "Roboto";
    } catch {
      fontName = "helvetica";
      doc.setFont("helvetica", "normal");
    }
  }

  return { doc, fontName };
}
