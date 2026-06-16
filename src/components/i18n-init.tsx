import { useEffect } from "react";
import "@/lib/i18n";
import i18n from "@/lib/i18n";

export function I18nInit() {
  useEffect(() => {
    const lang = i18n.language?.startsWith("ms") ? "ms" : "en";
    if (typeof document !== "undefined") document.documentElement.lang = lang;
    const onChange = (lng: string) => {
      if (typeof document !== "undefined") document.documentElement.lang = lng.startsWith("ms") ? "ms" : "en";
    };
    i18n.on("languageChanged", onChange);
    return () => i18n.off("languageChanged", onChange);
  }, []);
  return null;
}
