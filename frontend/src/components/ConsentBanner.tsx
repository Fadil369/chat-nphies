import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const storageKey = "nphies-consent";

export function ConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = window.localStorage.getItem(storageKey);
    setVisible(consent !== "true");
  }, []);

  if (!visible) return null;

  const acknowledge = () => {
    window.localStorage.setItem(storageKey, "true");
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/40 bg-gray-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 text-sm">
        <p className="text-gray-300">{t("consent_notice")}</p>
        <button
          type="button"
          onClick={acknowledge}
          className="rounded-md bg-primary px-4 py-2 text-gray-900"
        >
          {t("consent_ack")}
        </button>
      </div>
    </div>
  );
}
