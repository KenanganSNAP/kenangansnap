import logoAsset from "@/assets/kenanganbooth-mark.asset.json";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const wrap = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-12 w-12";
  return (
    <div className="inline-flex items-center gap-2">
      <img
        src={logoAsset.url}
        alt="Kenangan Booth logo"
        className={`${wrap} shrink-0 rounded-full object-cover shadow-[0_4px_14px_-6px_rgba(0,0,0,0.5)]`}
      />
      <div className="leading-tight">
        <div className="text-[11px] uppercase tracking-[0.25em] text-ink/70">Kenangan</div>
        <div className="text-xs font-medium text-ink/55">Snap booth</div>
      </div>
    </div>
  );
}
