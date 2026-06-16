import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BrandMark } from "@/components/brand-mark";
import { HeaderControls } from "@/components/header-controls";

export function PublicHeader() {
  const { t } = useTranslation();
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6">
      <BrandMark />
      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link to="/pricing" className="text-ink/70 hover:text-ink dark:text-foreground/70 dark:hover:text-foreground">{t("nav.pricing")}</Link>
        <Link to="/how-it-works" className="text-ink/70 hover:text-ink dark:text-foreground/70 dark:hover:text-foreground">{t("nav.howItWorks")}</Link>
        <Link to="/about" className="text-ink/70 hover:text-ink dark:text-foreground/70 dark:hover:text-foreground">{t("nav.about")}</Link>
        <Link to="/auth" className="hidden text-ink/70 hover:text-ink sm:inline dark:text-foreground/70 dark:hover:text-foreground">{t("nav.signIn")}</Link>
        <Link
          to="/auth"
          className="rounded-full bg-ink px-4 py-2 text-cream shadow-[0_8px_24px_-10px_rgba(40,25,15,0.6)] transition hover:opacity-90 dark:bg-primary dark:text-primary-foreground"
        >
          {t("nav.hostEvent")}
        </Link>
        <HeaderControls />
      </nav>
    </header>
  );
}
