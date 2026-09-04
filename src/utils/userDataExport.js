export const EXPORT_FORMAT = "mealplanner-user-data";
export const EXPORT_VERSION = 1;

/**
 * The free Firebase tier has no automatic backups, so the export is the user's
 * only copy of their data — and doubles as a way off the platform.
 */
export function buildExport({ recipeOverlay, products, ingredientDefaults, plan }) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    recipes: recipeOverlay,
    products,
    ingredientDefaults: ingredientDefaults || {},
    plan: plan || null,
  };
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Throws when the file is not a backup produced by this app. */
export function parseImport(text) {
  const payload = JSON.parse(text);
  if (payload?.format !== EXPORT_FORMAT) throw new Error("unrecognized-format");
  if (payload.version > EXPORT_VERSION) throw new Error("unsupported-version");
  return {
    recipes: Array.isArray(payload.recipes) ? payload.recipes.filter((r) => r?.id) : [],
    products: Array.isArray(payload.products) ? payload.products.filter((p) => p?.id) : [],
    ingredientDefaults: payload.ingredientDefaults || {},
    plan: payload.plan || null,
  };
}
