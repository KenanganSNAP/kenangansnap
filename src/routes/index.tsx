import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Camera, Mic, MessageSquareHeart, QrCode, Download, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { getHomepageSettings } from "@/lib/kenangan.functions";

const homepageQuery = queryOptions({
  queryKey: ["homepage-public"],
  queryFn: () => getHomepageSettings(),
});

const ICONS = [QrCode, Camera, Mic, MessageSquareHeart];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KenanganSnap — A QR memory booth for every event" },
      { name: "description", content: "Hosts launch a private memory booth. Guests scan one QR to send photos, voice notes, and written messages — no app required." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homepageQuery),
  component: Landing,
});

function Landing() {
  const { data: s } = useSuspenseQuery(homepageQuery);
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <BrandMark />
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/auth" className="hidden text-ink/70 hover:text-ink sm:inline">Sign in</Link>
          <Link
            to="/auth"
            className="rounded-full bg-ink px-4 py-2 text-cream shadow-[0_8px_24px_-10px_rgba(40,25,15,0.6)] transition hover:opacity-90"
          >
            Host an event
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-6 pb-20 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-cream/70 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-ink/70">
          <Sparkles size={14} /> {s.hero_eyebrow}
        </div>
        <h1 className="font-serif text-5xl italic leading-[0.95] text-ink sm:text-7xl md:text-[5.5rem]">
          {s.hero_title_line1} <br />
          <span className="font-script text-gold sm:text-[6rem]">{s.hero_title_line2}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-base text-ink/70 sm:text-lg">
          {s.hero_subtitle}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm tracking-wide text-cream shadow-[0_12px_30px_-12px_rgba(40,25,15,0.7)] transition hover:opacity-90"
          >
            {s.cta_primary} <span aria-hidden>→</span>
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream/60 px-6 py-3 text-sm text-ink transition hover:bg-cream"
          >
            {s.cta_secondary}
          </a>
        </div>

      </section>

      <section id="how" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-center font-serif text-3xl italic text-ink sm:text-4xl">{s.section_title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink/65">
          {s.section_subtitle}
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {s.features.map((f, i) => {
            const Icon = ICONS[i] ?? Sparkles;
            return (
              <div key={i} className="rounded-2xl border border-ink/10 bg-card p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink/90 text-cream">
                  <Icon size={18} />
                </div>
                <h3 className="mt-4 font-serif text-xl italic">{f.title}</h3>
                <p className="mt-1 text-sm text-ink/70">{f.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-ink/70">
          <Download size={16} /> Every photo and voice note is downloadable in one tap.
        </div>
      </section>

      <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink/50">
        © {new Date().getFullYear()} KenanganSnap · {s.footer_note}
      </footer>
    </div>
  );
}
