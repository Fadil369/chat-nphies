import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const nextLang = i18n.language === "ar" ? "en" : "ar";

  const toggle = () => {
    void i18n.changeLanguage(nextLang);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-300 hover:border-primary hover:text-primary"
    >
      {nextLang === "ar" ? t("toggle_language") : t("language_english")}
    </button>
  );
}
