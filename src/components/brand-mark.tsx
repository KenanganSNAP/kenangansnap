export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const wrap = size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-9 w-9 text-[10px]" : "h-12 w-12 text-sm";
  return (
    <div className={`inline-flex items-center gap-2`}>
      <div className={`grid ${wrap} shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-soft to-gold/70 font-serif italic text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--gold)_50%,transparent)]`}>
        KS
      </div>
      <div className="leading-tight">
        <div className="text-[11px] uppercase tracking-[0.25em] text-ink/70">Kenangan</div>
        <div className="text-xs font-medium text-ink/55">Snap booth</div>
      </div>
    </div>
  );
}
