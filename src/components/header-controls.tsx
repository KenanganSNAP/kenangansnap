import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export function HeaderControls({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function toggleLang() {
    const next = i18n.language?.startsWith("ms") ? "en" : "ms";
    i18n.changeLanguage(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }

  const langLabel = i18n.language?.startsWith("ms") ? "BM" : "EN";

  return (
    <div className={`flex items-center gap-1 ${compact ? "" : ""}`}>
      <button
        type="button"
        onClick={toggleLang}
        aria-label={t("common.language")}
        className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/80 transition hover:bg-ink/5 dark:border-foreground/20 dark:text-foreground/80"
      >
        <Languages size={13} strokeWidth={2} />
        {langLabel}
      </button>
    </div>
  );
}
