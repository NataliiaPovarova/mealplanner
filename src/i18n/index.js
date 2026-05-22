import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ruUI from "./locales/ru/ui.json";
import enUI from "./locales/en/ui.json";

const savedLang = typeof localStorage !== "undefined" ? localStorage.getItem("lang") : null;
const browserLang = typeof navigator !== "undefined" ? navigator.language?.slice(0, 2) : "ru";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { ui: ruUI },
      en: { ui: enUI },
    },
    lng: savedLang || (browserLang === "en" ? "en" : "ru"),
    fallbackLng: "ru",
    defaultNS: "ui",
    interpolation: { escapeValue: false },
  });

i18n.on("languageChanged", (lng) => {
  if (typeof localStorage !== "undefined") localStorage.setItem("lang", lng);
});

export default i18n;
