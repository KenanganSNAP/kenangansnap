import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Languages } from "lucide-react";

export function HeaderControls({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function toggleTheme() {
    const next = (mounted ? resolvedTheme : theme) === "dark" ? "light" : "dark";
    setTheme(next);
  }

  function toggleLang() {
    const next = i18n.language?.startsWith("ms") ? "en" : "ms";
    i18n.changeLanguage(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }

  const isDark = mounted && resolvedTheme === "dark";
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
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={t("common.theme")}
        suppressHydrationWarning
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/15 text-ink/80 transition hover:bg-ink/5 dark:border-foreground/20 dark:text-foreground/80"
      >
        {isDark ? <Sun size={14} strokeWidth={2} /> : <Moon size={14} strokeWidth={2} />}
      </button>
    </div>
  );
}
