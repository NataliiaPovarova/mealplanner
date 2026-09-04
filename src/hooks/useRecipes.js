import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ruRecipes from "../data/recipes/ru.json";
import enRecipes from "../data/recipes/en.json";
import { useUserData } from "../contexts/UserDataContext";
import { applyNutrition } from "../utils/computeNutrition";
import { brandOverridesFor, mergeRecipeOverlay } from "../utils/userRecipes";

const recipesByLang = { ru: ruRecipes, en: enRecipes };

/**
 * Shipped catalog + the signed-in user's overlay, with nutrition recalculated
 * for anything the user created, edited, or mapped to their own brand.
 */
export default function useRecipes() {
  const { t, i18n } = useTranslation();
  const { recipeOverlay, products, ingredientDefaults } = useUserData();
  const lang = recipesByLang[i18n.language] ? i18n.language : "ru";

  return useMemo(() => {
    const merged = mergeRecipeOverlay(recipesByLang[lang], recipeOverlay, lang, t);
    return applyNutrition(merged, brandOverridesFor(products, ingredientDefaults));
  }, [lang, t, recipeOverlay, products, ingredientDefaults]);
}
