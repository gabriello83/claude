import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";
import en from "./locales/en.json";
import it from "./locales/it.json";
import fr from "./locales/fr.json";

export const IDIOMAS = ["es", "en", "it", "fr"] as const;

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    it: { translation: it },
    fr: { translation: fr },
  },
  lng: localStorage.getItem("digivend.lang") ?? "es",
  fallbackLng: "es",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => localStorage.setItem("digivend.lang", lng));

export default i18n;
