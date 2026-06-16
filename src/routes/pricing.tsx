import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getPage } from "@/lib/cms.functions";
import { Check } from "lucide-react";
import { PublicHeader } from "@/components/public-header";

const pricingQuery = queryOptions({
  queryKey: ["page", "pricing_page"],
  queryFn: () => getPage({ data: { key: "pricing_page" } }),
});

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — KenanganSnap" },
      { name: "description", content: "Simple per-event packages. Pick the plan that fits your gathering." },
      { property: "og:title", content: "Pricing — KenanganSnap" },
      { property: "og:description", content: "Simple per-event packages. Pick the plan that fits your gathering." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(pricingQuery),
  component: Pricing,
});

function Pricing() {
  const { data } = useSuspenseQuery(pricingQuery);
  const page = data as Awaited<ReturnType<typeof getPage>> & { tiers: { name: string; price: string; period: string; features: string[]; cta_label: string; highlighted: boolean }[]; footer_note: string };
  const heroImg = data._signed["hero"];
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="mx-auto max-w-5xl px-5 pt-6 pb-12 text-center">
        <h1 className="font-serif text-5xl italic leading-[0.95] text-ink sm:text-6xl">{page.hero.title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink/70 sm:text-lg">{page.hero.subtitle}</p>
        {heroImg && <img src={heroImg} alt="" className="mx-auto mt-8 max-h-80 rounded-2xl object-cover" />}
      </section>
      <section className="mx-auto grid max-w-5xl gap-5 px-5 pb-16 sm:grid-cols-3">
        {page.tiers.map((t, i) => (
          <div key={i} className={`rounded-2xl border p-6 ${t.highlighted ? "border-gold bg-card shadow-[0_20px_50px_-25px_rgba(40,25,15,0.5)]" : "border-ink/10 bg-card"}`}>
            <div className="font-serif text-2xl italic">{t.name}</div>
            <div className="mt-3 text-3xl font-semibold text-ink">{t.price}</div>
            <div className="text-xs uppercase tracking-wider text-ink/55">{t.period}</div>
            <ul className="mt-5 space-y-2 text-sm text-ink/80">
              {t.features.map((f, j) => (
                <li key={j} className="flex items-start gap-2"><Check size={16} className="mt-0.5 text-gold" /> {f}</li>
              ))}
            </ul>
            <Link to="/auth" className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm text-cream">{t.cta_label}</Link>
          </div>
        ))}
      </section>
      <p className="pb-12 text-center text-sm text-ink/55">{page.footer_note}</p>
    </div>
  );
}
