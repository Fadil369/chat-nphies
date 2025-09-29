import { MouseEvent, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Activity = {
  id: number;
  title: string;
  description: string;
  status: "approved" | "pending" | "info";
};

type Shortcut = {
  id: string;
  title: string;
  description: string;
  to: string;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const activity = useMemo<Activity[]>(
    () => [
      { id: 1, title: t("activity_eligibility_title"), description: t("activity_eligibility_desc"), status: "approved" },
      { id: 2, title: t("activity_claim_title"), description: t("activity_claim_desc"), status: "pending" },
      { id: 3, title: t("activity_payment_title"), description: t("activity_payment_desc"), status: "info" }
    ],
    [t]
  );

  const shortcuts = useMemo<Shortcut[]>(
    () => [
      { id: "eligibility", title: t("shortcut_eligibility_title"), description: t("shortcut_eligibility_desc"), to: "/eligibility" },
      { id: "claim", title: t("shortcut_claim_title"), description: t("shortcut_claim_desc"), to: "/claim" },
      { id: "chat", title: t("shortcut_chat_title"), description: t("shortcut_chat_desc"), to: "#assistant" }
    ],
    [t]
  );

  const handleShortcutClick = (event: MouseEvent<HTMLAnchorElement>, destination: string) => {
    if (destination.startsWith("#")) {
      event.preventDefault();
      const node = document.querySelector(destination);
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-primary">{t("dashboard_title")}</h1>
        <p className="text-sm text-gray-400">{t("dashboard_intro")}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {shortcuts.map((shortcut: Shortcut) => (
          <Link
            key={shortcut.id}
            to={shortcut.to}
            className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-950/60 p-4 shadow transition hover:border-primary hover:shadow-primary/20"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => handleShortcutClick(event, shortcut.to)}
          >
            <div className="flex flex-col gap-2">
              <span className="text-sm uppercase tracking-wide text-primary/80">{t("quick_link")}</span>
              <h3 className="text-lg font-semibold text-gray-100">{shortcut.title}</h3>
              <p className="text-sm text-gray-400">{shortcut.description}</p>
            </div>
            <span className="mt-4 inline-flex items-center text-xs font-medium text-primary transition group-hover:translate-x-1">
              {t("launch")}
            </span>
          </Link>
        ))}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-200">{t("recent_activity")}</h2>
          <span className="text-xs uppercase tracking-wide text-gray-500">{t("sync_status")}</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {activity.map((item) => (
            <article key={item.id} className="rounded-lg border border-gray-800 bg-gray-950/70 p-4">
              <header className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wide text-gray-500">{item.title}</span>
                <span
                  className={`text-xs font-semibold uppercase ${
                    item.status === "approved"
                      ? "text-primary"
                      : item.status === "pending"
                        ? "text-accent"
                        : "text-gray-400"
                  }`}
                >
                  {t(`status_${item.status}` as const)}
                </span>
              </header>
              <p className="mt-2 text-sm text-gray-300">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm text-primary">
        <h2 className="text-base font-semibold text-primary">{t("copilot_tip_title")}</h2>
        <p className="mt-2 text-primary/90">{t("copilot_tip_body")}</p>
      </section>
    </div>
  );
}
