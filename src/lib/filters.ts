export type FilterId = "none" | "warm" | "fade" | "noir" | "golden" | "cinematic";

export const FILTERS: { id: FilterId; label: string; css: string }[] = [
  { id: "none", label: "None", css: "none" },
  { id: "warm", label: "Warm", css: "saturate(1.15) sepia(0.18) hue-rotate(-8deg) brightness(1.04)" },
  { id: "fade", label: "Fade", css: "contrast(0.92) saturate(0.85) brightness(1.05)" },
  { id: "noir", label: "Noir", css: "grayscale(1) contrast(1.25) brightness(0.95)" },
  { id: "golden", label: "Golden", css: "saturate(1.2) sepia(0.3) brightness(1.05) hue-rotate(-12deg)" },
  { id: "cinematic", label: "Cinematic", css: "contrast(1.1) saturate(1.1) hue-rotate(-4deg) brightness(0.98)" },
];

export function getFilterCss(id: FilterId) {
  return FILTERS.find((f) => f.id === id)?.css ?? "none";
}
