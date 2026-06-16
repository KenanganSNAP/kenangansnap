import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Mic, MessageSquareHeart, QrCode, Download, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KenanganSnap — A QR memory booth for every event" },
      { name: "description", content: "Hosts launch a private memory booth. Guests scan one QR to send photos, voice notes, and written messages — no app required." },
    ],
  }),
  component: Landing,
});

function Landing() {
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
          <Sparkles size={14} /> A live memory booth
        </div>
        <h1 className="font-serif text-5xl italic leading-[0.95] text-ink sm:text-7xl md:text-[5.5rem]">
          Every guest. <br />
          <span className="font-script text-gold sm:text-[6rem]">Every memory.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-base text-ink/70 sm:text-lg">
          One QR code at the door. Your guests send photos, voice notes, and heartfelt
          messages straight to your private album — no app, no sign-ups.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm tracking-wide text-cream shadow-[0_12px_30px_-12px_rgba(40,25,15,0.7)] transition hover:opacity-90"
          >
            Start your event <span aria-hidden>→</span>
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream/60 px-6 py-3 text-sm text-ink transition hover:bg-cream"
          >
            See how it works
          </a>
        </div>

        <div className="relative mx-auto mt-16 max-w-sm">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-gold-soft/60 via-cream to-rose/20 blur-2xl" />
          <div className="overflow-hidden rounded-[2rem] border border-ink/10 bg-cream-deep shadow-[0_30px_60px_-30px_rgba(40,25,15,0.5)]">
            <div className="aspect-[9/16] bg-gradient-to-b from-cream to-cream-deep p-6">
              <div className="text-center text-[10px] uppercase tracking-[0.4em] text-ink/50">The kenangan of</div>
              <h2 className="mt-3 font-script text-5xl text-gold">Aisha &amp; Daniel</h2>
              <div className="mt-1 text-xs italic tracking-wider text-ink/60">12 . 04 . 2026 — Kuala Lumpur</div>
              <div className="mx-auto mt-6 aspect-square w-44 rounded-2xl bg-[url('https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80')] bg-cover bg-center shadow-[inset_0_0_0_6px_rgba(255,255,255,0.85)]" />
              <button className="mt-8 w-full rounded-full bg-ink py-3 text-sm tracking-wider text-cream">
                START CAPTURE →
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-center font-serif text-3xl italic text-ink sm:text-4xl">A booth without a booth</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink/65">
          Four ways your guests can leave something behind — gathered into one elegant private album.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: QrCode, title: "One QR", body: "Print it, frame it, project it. Guests scan and they're in." },
            { icon: Camera, title: "Film photos", body: "Live camera with five tactile film filters — warm, fade, noir, golden, cinematic." },
            { icon: Mic, title: "Voice notes", body: "Hold-to-record up to 60 seconds. The voice you remember, kept forever." },
            { icon: MessageSquareHeart, title: "Written wishes", body: "A small page for the long messages — doa, jokes, secrets." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink/10 bg-card p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink/90 text-cream">
                <f.icon size={18} />
              </div>
              <h3 className="mt-4 font-serif text-xl italic">{f.title}</h3>
              <p className="mt-1 text-sm text-ink/70">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-ink/70">
          <Download size={16} /> Every photo and voice note is downloadable in one tap.
        </div>
      </section>

      <footer className="border-t border-ink/10 py-8 text-center text-xs text-ink/50">
        © {new Date().getFullYear()} KenanganSnap · Crafted with care
      </footer>
    </div>
  );
}
