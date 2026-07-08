import { useTranslation } from "react-i18next";
import { IDIOMAS } from "@/i18n";

const NOMBRES: Record<string, string> = {
  es: "Español",
  en: "English",
  it: "Italiano",
  fr: "Français",
};

export function SelectorIdioma() {
  const { i18n, t } = useTranslation();
  return (
    <label className="selector-idioma">
      {t("common.language")}
      <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
        {IDIOMAS.map((lng) => (
          <option key={lng} value={lng}>
            {NOMBRES[lng]}
          </option>
        ))}
      </select>
    </label>
  );
}
