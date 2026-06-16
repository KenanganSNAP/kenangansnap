import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getPage } from "@/lib/cms.functions";
import { PublicHeader } from "@/components/public-header";

const pageQuery = queryOptions({
  queryKey: ["page", "about_page"],
  queryFn: () => getPage({ data: { key: "about_page" } }),
});

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Kenangan" },
      { name: "description", content: "The story and team behind Kenangan, a memory booth for every event." },
      { property: "og:title", content: "About Kenangan" },
      { property: "og:description", content: "The story and team behind Kenangan, a memory booth for every event." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(pageQuery),
  component: About,
});

function About() {
  const { data } = useSuspenseQuery(pageQuery);
  const page = data as Awaited<ReturnType<typeof getPage>> & { mission: string; team: { name: string; role: string; photo_path: string | null; bio: string }[]; closing: string };
  const heroImg = data._signed["hero"];
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="mx-auto max-w-4xl px-5 pt-6 pb-10 text-center">
        <h1 className="font-serif text-5xl italic leading-[0.95] text-ink sm:text-6xl">{page.hero.title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink/70 sm:text-lg">{page.hero.subtitle}</p>
        {heroImg && <img src={heroImg} alt="" className="mx-auto mt-8 max-h-80 rounded-2xl object-cover" />}
      </section>
      <section className="mx-auto max-w-3xl px-5 pb-10">
        <div className="rounded-2xl border border-ink/10 bg-card p-6">
          <div className="text-[10px] uppercase tracking-wider text-ink/55">Our mission</div>
          <p className="mt-3 text-base text-ink/85">{page.mission}</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 pb-12">
        <h2 className="text-center font-serif text-3xl italic">The team</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {page.team.map((m, i) => {
            const img = data._signed[`team_${i}`];
            return (
              <div key={i} className="rounded-2xl border border-ink/10 bg-card p-5 text-center">
                {img ? <img src={img} alt="" className="mx-auto h-24 w-24 rounded-full object-cover" /> : <div className="mx-auto h-24 w-24 rounded-full bg-ink/10" />}
                <div className="mt-3 font-serif text-xl italic">{m.name}</div>
                <div className="text-xs uppercase tracking-wider text-ink/55">{m.role}</div>
                <p className="mt-2 text-sm text-ink/75">{m.bio}</p>
              </div>
            );
          })}
        </div>
      </section>
      <p className="px-5 pb-16 text-center text-sm text-ink/55">{page.closing}</p>
    </div>
  );
}
