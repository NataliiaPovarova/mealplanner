import autoTable from "jspdf-autotable";
import { initPdfDoc } from "./pdfFonts";

export default async function generateShoppingListPdf({
  grouped,
  sortedCategories,
  t,
  language,
}) {
  const { doc, fontName } = await initPdfDoc();

  const margin = 15;
  let startY = 20;

  doc.setFont(fontName, "bold");
  doc.setFontSize(18);
  doc.text(t("pdf.shoppingTitle"), margin, startY);
  startY += 10;

  sortedCategories.forEach((category, ci) => {
    if (ci > 0) startY += 4;

    const items = grouped[category];
    const body = items.map((item) => [
      item.name,
      item.amount > 0
        ? `${item.amount} ${t(`units.${item.unit}`, { defaultValue: item.unit })}`
        : "—",
    ]);

    autoTable(doc, {
      startY,
      head: [[t(`category.${category}`), ""]],
      body,
      margin: { left: margin, right: margin },
      styles: { font: fontName, fontSize: 10, cellPadding: 3.5 },
      headStyles: { fillColor: [45, 42, 36], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right", cellWidth: 35 } },
    });

    startY = doc.lastAutoTable.finalY;
  });

  doc.save(language === "ru" ? "список-покупок.pdf" : "shopping-list.pdf");
}
