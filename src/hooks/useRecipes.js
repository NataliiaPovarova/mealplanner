import { useTranslation } from "react-i18next";
import ruRecipes from "../data/recipes/ru.json";
import enRecipes from "../data/recipes/en.json";

const recipesByLang = { ru: ruRecipes, en: enRecipes };

export default function useRecipes() {
  const { i18n } = useTranslation();
  return recipesByLang[i18n.language] || ruRecipes;
}
