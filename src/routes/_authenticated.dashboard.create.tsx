import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createEvent } from "@/lib/kenangan.functions";
import { slugify } from "@/lib/slug";
import { resizeImageToDataUrl } from "@/lib/image-resize";
import { ArrowLeft, Upload, Pencil, Check } from "lucide-react";

function randomSuffix() {
  return Math.random().toString(36).slice(2, 5);
}

export const Route = createFileRoute("/_authenticated/dashboard/create")({
  component: CreateEvent,
});

function CreateEvent() {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const base = slugify(title);
  const autoSlug = useMemo(() => (base ? `${base}-${randomSuffix()}` : ""), [base]);
  const effectiveSlug = slugTouched ? slug : autoSlug;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [eventType, setEventType] = useState<"wedding" | "birthday" | "party" | "travel" | "ceremony">("wedding");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [revealAt, setRevealAt] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleImage(file: File | undefined, setter: (s: string | null) => void) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    try { setter(await resizeImageToDataUrl(file)); } catch { toast.error("Could not read image"); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const finalSlug = effectiveSlug || slugify(title);
      const event = await createEvent({
        data: {
          title, slug: finalSlug, eventType,
          date: date || null, venue: venue || null,
          welcomeMessage: welcomeMessage || null,
          revealAt: revealAt || null,
          coverDataUrl: cover, invitationDataUrl: invitation,
        },
      });
      toast.success("Event created");
      nav({ to: "/dashboard/event/$id", params: { id: event.id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-4">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink/70 hover:text-ink">
        <ArrowLeft size={14} /> Back
      </Link>
      <h1 className="mt-4 font-serif text-4xl italic">Create event</h1>
      <p className="mt-1 text-ink/65">A single QR code becomes your guests' way in.</p>

      <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-card p-6">
        <Field label="Event title">
          <input
            required value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 outline-none focus:border-gold"
            placeholder="Aisha & Daniel"
          />
        </Field>
        <Field label="Event web address (optional)">
          <div className="rounded-xl border border-ink/15 bg-cream/70 px-4 py-3">
            <div className="break-all font-mono text-sm text-ink/80">
              <span className="text-ink/50">{origin}/event/</span>
              <span className="text-ink">{effectiveSlug || "your-event"}</span>
            </div>
            {!editingSlug ? (
              <button type="button"
                onClick={() => { if (!slugTouched) setSlug(effectiveSlug); setEditingSlug(true); }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-ink/70 hover:text-gold">
                <Pencil size={12} /> Edit custom link
              </button>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <input value={slug}
                  onChange={(e) => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                  className="flex-1 rounded-lg border border-ink/15 bg-white px-3 py-1.5 font-mono text-sm outline-none focus:border-gold"
                  placeholder="aisha-daniel" />
                <button type="button" onClick={() => setEditingSlug(false)}
                  className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-xs text-cream">
                  <Check size={12} /> Done
                </button>
              </div>
            )}
            <p className="mt-1 text-[11px] text-ink/55">Auto-generated from your title — ready to share.</p>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select value={eventType} onChange={(e) => setEventType(e.target.value as typeof eventType)}
              className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 outline-none">
              <option value="wedding">Wedding</option>
              <option value="birthday">Birthday</option>
              <option value="party">Party</option>
              <option value="travel">Travel</option>
              <option value="ceremony">Ceremony</option>
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 outline-none" />
          </Field>
        </div>
        <Field label="Venue">
          <input value={venue} onChange={(e) => setVenue(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 outline-none"
            placeholder="KLCC Convention Centre" />
        </Field>
        <Field label="Welcome message (optional)">
          <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 outline-none"
            placeholder="Bismillah — welcome to our special day…" />
        </Field>
        <Field label="Reveal at (optional — leave blank for instant reveal)">
          <input type="datetime-local" value={revealAt} onChange={(e) => setRevealAt(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 outline-none" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <ImageField label="Cover photo" value={cover} onChange={(f) => handleImage(f, setCover)} />
          <ImageField label="Invitation image" value={invitation} onChange={(f) => handleImage(f, setInvitation)} />
        </div>

        <button disabled={busy} type="submit"
          className="mt-2 w-full rounded-xl bg-ink py-3 text-sm tracking-wider text-cream disabled:opacity-60">
          {busy ? "Creating…" : "CREATE EVENT →"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string | null; onChange: (f: File | undefined) => void }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      <div className="mt-1 grid aspect-[4/5] place-items-center overflow-hidden rounded-xl border border-dashed border-ink/20 bg-cream/50 text-center text-sm text-ink/55">
        {value ? (
          <img src={value} alt="preview" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1"><Upload size={20} /> Tap to upload</span>
        )}
        <input type="file" accept="image/*" className="hidden"
          onChange={(e) => onChange(e.target.files?.[0])} />
      </div>
    </label>
  );
}
