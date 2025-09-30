import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Dashboard from "./pages/Dashboard";
import Eligibility from "./pages/Eligibility";
import Claim from "./pages/Claim";
import BrainSAITDashboard from "./components/BrainSAITDashboard";
import { ChatBot } from "./components/ChatBot";
import { LanguageToggle } from "./components/LanguageToggle";
import { ConsentBanner } from "./components/ConsentBanner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PWAManager } from "./components/PWAManager";
import { useServiceWorker } from "./hooks/useServiceWorker";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${isActive ? "bg-primary text-gray-900" : "text-gray-400 hover:text-white"}`;

export default function App() {
  const { i18n, t } = useTranslation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { register } = useServiceWorker();

  useEffect(() => {
    const dir = i18n.language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = dir;
  }, [i18n.language]);

  // Register service worker on mount
  useEffect(() => {
    register();
  }, [register]);

  useEffect(() => {
    document.body.style.overflow = assistantOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [assistantOpen]);

  useEffect(() => {
    setAssistantOpen(false);
  }, [i18n.language]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const query = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if ("matches" in event ? event.matches : query.matches) {
        setAssistantOpen(false);
      }
    };

    handleChange(query);
    query.addEventListener("change", handleChange as EventListener);
    return () => {
      query.removeEventListener("change", handleChange as EventListener);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
        {/* Skip Links */}
        <a href="#main-content" className="skip-link">
          {t("skip_to_main")}
        </a>
        <a href="#navigation" className="skip-link">
          {t("skip_to_navigation")}
        </a>
        <header 
          className="border-b border-gray-800 bg-gray-950/70 backdrop-blur"
          role="banner"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="font-display text-xl tracking-widest text-primary">NPHIES.AI</span>
              <p className="mt-1 text-xs text-gray-400 md:text-sm">{t("tagline")}</p>
            </div>
            <nav 
              id="navigation"
              className="flex flex-wrap items-center gap-2"
              role="navigation"
              aria-label={t("main_navigation")}
            >
              <NavLink to="/" className={navItemClass} end>
                {t("nav_dashboard")}
              </NavLink>
              <NavLink to="/eligibility" className={navItemClass}>
                {t("nav_eligibility")}
              </NavLink>
              <NavLink to="/claim" className={navItemClass}>
                {t("nav_claim")}
              </NavLink>
              <NavLink to="/brainsait" className={navItemClass}>
                🧠 BrainSAIT
              </NavLink>
              <LanguageToggle />
              <button
                type="button"
                className="rounded-md border border-primary/60 px-3 py-2 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
                onClick={() => setAssistantOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={assistantOpen}
              >
                {t("assistant_open")}
              </button>
            </nav>
          </div>
        </header>
        <main 
          id="main-content"
          className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 grid gap-6 lg:grid-cols-[1fr_360px]"
          role="main"
          tabIndex={-1}
        >
          <section 
            className="rounded-xl border border-gray-800 bg-gray-900/60 backdrop-blur p-6 shadow-lg"
            role="region"
            aria-label={t("main_content_area")}
          >
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/eligibility" element={<Eligibility />} />
                <Route path="/claim" element={<Claim />} />
                <Route path="/brainsait" element={<BrainSAITDashboard />} />
              </Routes>
            </ErrorBoundary>
          </section>
          <aside
            className="hidden h-full rounded-xl border border-gray-800 bg-gray-900/60 backdrop-blur p-4 shadow-lg lg:block"
            aria-label={t("assistant_title")}
          >
            <ErrorBoundary>
              <ChatBot />
            </ErrorBoundary>
          </aside>
        </main>
        <ConsentBanner />
        <PWAManager />
      </div>
      {assistantOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur lg:hidden" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{t("assistant_title")}</p>
              <h2 className="text-lg font-semibold text-primary">{t("assistant_title_anchor")}</h2>
            </div>
            <button
              type="button"
              className="rounded-md border border-gray-700 px-3 py-1 text-sm text-gray-300 transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => setAssistantOpen(false)}
            >
              {t("assistant_close")}
            </button>
          </div>
          <div className="flex-1 overflow-hidden px-2 pb-4">
            <div className="h-full rounded-xl border border-gray-800 bg-gray-900/70 p-3 shadow-inner">
              <ErrorBoundary>
                <ChatBot />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      ) : null}
    </BrowserRouter>
  );
}
