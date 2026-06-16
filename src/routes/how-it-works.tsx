import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getPage } from "@/lib/cms.functions";
import { PublicHeader } from "@/components/public-header";

const pageQuery = queryOptions({
  queryKey: ["page", "how_it_works_page"],
  queryFn: () => getPage({ data: { key: "how_it_works_page" } }),
});

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — KenanganSnap" },
      { name: "description", content: "From QR scan to private album in four simple steps." },
      { property: "og:title", content: "How it works — KenanganSnap" },
      { property: "og:description", content: "From QR scan to private album in four simple steps." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(pageQuery),
  component: HowItWorks,
});

function HowItWorks() {
  const { data } = useSuspenseQuery(pageQuery);
  const page = data as Awaited<ReturnType<typeof getPage>> & { steps: { title: string; body: string; image_path: string | null }[]; cta_label: string; cta_href: string };
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="mx-auto max-w-4xl px-5 pt-6 pb-12 text-center">
        <h1 className="font-serif text-5xl italic leading-[0.95] text-ink sm:text-6xl">{page.hero.title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink/70 sm:text-lg">{page.hero.subtitle}</p>
      </section>
      <section className="mx-auto max-w-4xl space-y-6 px-5 pb-12">
        {page.steps.map((s, i) => {
          const img = data._signed[`step_${i}`];
          return (
            <div key={i} className="grid gap-4 rounded-2xl border border-ink/10 bg-card p-6 sm:grid-cols-[1fr_auto]">
              <div>
                <h2 className="font-serif text-2xl italic">{s.title}</h2>
                <p className="mt-2 text-sm text-ink/75">{s.body}</p>
              </div>
              {img && <img src={img} alt="" className="h-32 w-full rounded-xl object-cover sm:w-48" />}
            </div>
          );
        })}
      </section>
      <div className="pb-16 text-center">
        <Link to={page.cta_href === "/auth" ? "/auth" : "/"} className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm text-cream">{page.cta_label} →</Link>
      </div>
    </div>
  );
}
