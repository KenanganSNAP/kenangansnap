import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Camera, Mic, MessageSquareHeart, QrCode, Download, Sparkles } from "lucide-react";
import { getHomepageSettings } from "@/lib/kenangan.functions";
import { listHomepageMedia, listTestimonials, getHomepageExtras } from "@/lib/cms.functions";
import { PublicHeader } from "@/components/public-header";

const homepageQuery = queryOptions({
  queryKey: ["homepage-public"],
  queryFn: () => getHomepageSettings(),
});
const mediaQuery = queryOptions({ queryKey: ["homepage-media"], queryFn: () => listHomepageMedia() });
const testimonialQuery = queryOptions({ queryKey: ["homepage-testimonials"], queryFn: () => listTestimonials() });
const extrasQuery = queryOptions({ queryKey: ["homepage-extras"], queryFn: () => getHomepageExtras() });

const ICONS = [QrCode, Camera, Mic, MessageSquareHeart];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KenanganSnap — A QR memory booth for every event" },
      { name: "description", content: "Hosts launch a private memory booth. Guests scan one QR to send photos, voice notes, and written messages — no app required." },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(homepageQuery);
    context.queryClient.prefetchQuery(mediaQuery);
    context.queryClient.prefetchQuery(testimonialQuery);
    context.queryClient.prefetchQuery(extrasQuery);
  },
  component: Landing,
});

function videoEmbed(url: string) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "iframe" as const, src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: "iframe" as const, src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return { kind: "video" as const, src: url };
}

function Landing() {
  const { data: s } = useSuspenseQuery(homepageQuery);
  const { data: media = [] } = useSuspenseQuery(mediaQuery);
  const { data: testimonials = [] } = useSuspenseQuery(testimonialQuery);
  const { data: extras } = useSuspenseQuery(extrasQuery);
  const hero = media.find((m) => m.is_hero) ?? null;
  const gallery = media.filter((m) => !m.is_hero);
  const embed = videoEmbed(extras?.video_url ?? "");

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <section className="mx-auto max-w-5xl px-5 pt-6 pb-20 text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-cream/70 px-4 py-1.5 text-[11px] uppercase tracking-[0.3em] text-ink/70">
          <Sparkles size={14} /> {s.hero_eyebrow}
        </div>
        <h1 className="font-serif text-5xl italic leading-[0.95] text-ink sm:text-7xl md:text-[5.5rem]">
          {s.hero_title_line1} <br />
          <span className="font-script text-gold sm:text-[6rem]">{s.hero_title_line2}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-base text-ink/70 sm:text-lg">{s.hero_subtitle}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm tracking-wide text-cream shadow-[0_12px_30px_-12px_rgba(40,25,15,0.7)] transition hover:opacity-90">
            {s.cta_primary} <span aria-hidden>→</span>
          </Link>
          <a href="#how" className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream/60 px-6 py-3 text-sm text-ink transition hover:bg-cream">{s.cta_secondary}</a>
        </div>
        {hero?.signed_url && (
          <img src={hero.signed_url} alt={hero.caption ?? ""} className="mx-auto mt-12 max-h-[420px] w-full max-w-3xl rounded-3xl object-cover" />
        )}
      </section>

      <section id="how" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-center font-serif text-3xl italic text-ink sm:text-4xl">{s.section_title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink/65">{s.section_subtitle}</p>
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

      {embed && (
        <section className="mx-auto max-w-4xl px-5 py-10">
          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-ink/5">
            <div className="aspect-video">
              {embed.kind === "iframe" ? (
                <iframe src={embed.src} className="h-full w-full" allowFullScreen title="Featured video" />
              ) : (
                <video src={embed.src} controls className="h-full w-full" />
              )}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-10">
          <h2 className="text-center font-serif text-3xl italic">From recent events</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {gallery.slice(0, 12).map((m) => (
              <img key={m.id} src={m.signed_url ?? ""} alt={m.caption ?? ""} className="aspect-square rounded-xl object-cover" loading="lazy" />
            ))}
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-12">
          <h2 className="text-center font-serif text-3xl italic">Loved by hosts</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.id} className="rounded-2xl border border-ink/10 bg-card p-5">
                <blockquote className="text-sm italic text-ink/85">“{t.quote}”</blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  {t.signed_url ? <img src={t.signed_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-ink/10" />}
                  <div>
                    <div className="text-sm font-medium">{t.author_name}</div>
                    {t.event_name && <div className="text-xs text-ink/55">{t.event_name}</div>}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink/50">
        © {new Date().getFullYear()} KenanganSnap · {s.footer_note}
      </footer>
    </div>
  );
}
