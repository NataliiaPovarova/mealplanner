import autoTable from "jspdf-autotable";
import { DAYS, SLOTS, formatIngredient } from "../constants";
import { initPdfDoc } from "./pdfFonts";

export default async function generateWeekPlanPdf({
  weekPlan,
  weekAddOns = {},
  meals,
  t,
  language,
}) {
  const { doc, fontName } = await initPdfDoc();

  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 2 * margin;
  const bottomMargin = 20;
  const lineHeight = 4.5;
  let y = 0;

  function checkPageBreak(needed) {
    if (y + needed > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }
  }

  // ── Plan table ──────────────────────────────────────────────

  doc.setFont(fontName, "bold");
  doc.setFontSize(18);
  doc.text(t("pdf.title"), margin, 20);

  const head = [
    ["", ...SLOTS.map((s) => t(`slots.${s}`))],
  ];

  const body = DAYS.map((day) => {
    const dayLabel = t(`days.${day}`);
    const cells = SLOTS.map((slot) => {
      const key = `${day}-${slot}`;
      const mealId = weekPlan[key];
      if (!mealId) return t("pdf.empty");
      const meal = meals.find((m) => m.id === mealId);
      const mealName = meal ? meal.name : t("pdf.empty");
      const addOnId = weekAddOns[key];
      const addOn = addOnId ? meals.find((m) => m.id === addOnId) : null;
      return addOn ? `${mealName}\n+ ${addOn.name}` : mealName;
    });
    return [dayLabel, ...cells];
  });

  autoTable(doc, {
    startY: 28,
    head,
    body,
    margin: { left: margin, right: margin },
    styles: { font: fontName, fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [45, 42, 36], fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 18 } },
  });

  // ── Recipes section ─────────────────────────────────────────

  const uniqueIds = [
    ...new Set([...Object.values(weekPlan), ...Object.values(weekAddOns)]),
  ];
  const uniqueMeals = uniqueIds
    .map((id) => meals.find((m) => m.id === id))
    .filter(Boolean);

  if (uniqueMeals.length === 0) {
    doc.save(language === "ru" ? "план-недели.pdf" : "week-plan.pdf");
    return;
  }

  doc.addPage();
  y = 20;

  doc.setFont(fontName, "bold");
  doc.setFontSize(18);
  doc.text(t("pdf.recipesHeading"), margin, y);
  y += 12;

  for (let i = 0; i < uniqueMeals.length; i++) {
    const meal = uniqueMeals[i];

    if (i > 0) {
      checkPageBreak(30);
      y += 4;
      doc.setDrawColor(200, 195, 185);
      doc.line(margin, y, margin + contentWidth, y);
      y += 8;
    }

    checkPageBreak(25);

    doc.setFont(fontName, "bold");
    doc.setFontSize(14);
    doc.text(meal.name, margin, y);
    y += 6;

    doc.setFont(fontName, "normal");
    doc.setFontSize(9);
    doc.text(
      `${t("recipe.prep")} ${meal.prepTime} · ${t("recipe.cook")} ${meal.cookTime} · ${meal.portions} ${t("recipe.portions")}`,
      margin,
      y
    );
    y += 5;

    doc.text(
      `${meal.perPortion.kcal} ${t("recipe.kcal")} | ${t("recipe.protein")} ${meal.perPortion.protein}${t("units.g")} | ${t("recipe.fat")} ${meal.perPortion.fat}${t("units.g")} | ${t("recipe.carbs")} ${meal.perPortion.carbs}${t("units.g")} | ${t("recipe.fiber")} ${meal.perPortion.fiber}${t("units.g")}`,
      margin,
      y
    );
    y += 7;

    // Ingredients
    doc.setFont(fontName, "bold");
    doc.setFontSize(10);
    checkPageBreak(10);
    doc.text(t("recipe.ingredients"), margin, y);
    y += 5;

    doc.setFont(fontName, "normal");
    doc.setFontSize(9);
    for (const ing of meal.ingredients) {
      const lines = doc.splitTextToSize(
        `· ${formatIngredient(ing, t, language)}`,
        contentWidth
      );
      checkPageBreak(lines.length * lineHeight);
      doc.text(lines, margin, y);
      y += lines.length * lineHeight;
    }
    y += 3;

    // Steps
    doc.setFont(fontName, "bold");
    doc.setFontSize(10);
    checkPageBreak(10);
    doc.text(t("recipe.steps"), margin, y);
    y += 5;

    doc.setFont(fontName, "normal");
    doc.setFontSize(9);
    meal.steps.forEach((step, si) => {
      const lines = doc.splitTextToSize(`${si + 1}. ${step}`, contentWidth);
      checkPageBreak(lines.length * lineHeight);
      doc.text(lines, margin, y);
      y += lines.length * lineHeight;
    });
    y += 3;

    // Tips
    if (meal.tips) {
      doc.setFont(fontName, "bold");
      doc.setFontSize(10);
      checkPageBreak(10);
      doc.text(t("recipe.tips"), margin, y);
      y += 5;

      doc.setFont(fontName, "normal");
      doc.setFontSize(9);
      const tipLines = doc.splitTextToSize(meal.tips, contentWidth);
      checkPageBreak(tipLines.length * lineHeight);
      doc.text(tipLines, margin, y);
      y += tipLines.length * lineHeight + 3;
    }

    // Fresh addition
    if (meal.freshAdd) {
      doc.setFont(fontName, "bold");
      doc.setFontSize(10);
      checkPageBreak(10);
      doc.text(t("recipe.freshAdd"), margin, y);
      y += 5;

      doc.setFont(fontName, "normal");
      doc.setFontSize(9);
      const freshLines = doc.splitTextToSize(meal.freshAdd, contentWidth);
      checkPageBreak(freshLines.length * lineHeight);
      doc.text(freshLines, margin, y);
      y += freshLines.length * lineHeight + 3;
    }
  }

  doc.save(language === "ru" ? "план-недели.pdf" : "week-plan.pdf");
}
