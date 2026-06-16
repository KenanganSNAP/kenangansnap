import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { createEvent } from "@/lib/kenangan.functions";
import { getCreateEventForm, type CreateEventField } from "@/lib/cms.functions";
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
  const { data: formConfig } = useQuery({
    queryKey: ["create-event-form"],
    queryFn: () => getCreateEventForm(),
  });

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
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Default eventType to first option if config customised it
  useEffect(() => {
    const t = formConfig?.fields.find((f) => f.key === "eventType");
    if (t?.options?.length && !t.options.includes(eventType)) {
      setEventType(t.options[0] as typeof eventType);
    }
  }, [formConfig, eventType]);

  async function handleImage(file: File | undefined, setter: (s: string | null) => void) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    try { setter(await resizeImageToDataUrl(file)); } catch { toast.error("Could not read image"); }
  }

  function valueFor(f: CreateEventField): string {
    switch (f.key) {
      case "title": return title;
      case "venue": return venue;
      case "welcomeMessage": return welcomeMessage;
      case "date": return date;
      case "revealAt": return revealAt;
      case "eventType": return eventType;
      default: return customValues[f.key] ?? "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Required-field validation honours admin config
      for (const f of formConfig?.fields ?? []) {
        if (!f.visible || !f.required) continue;
        if (f.type === "image") {
          if (f.key === "cover" && !cover) throw new Error(`${f.label} is required`);
          if (f.key === "invitation" && !invitation) throw new Error(`${f.label} is required`);
          continue;
        }
        const v = valueFor(f).trim();
        if (!v) throw new Error(`${f.label} is required`);
      }
      const finalSlug = effectiveSlug || slugify(title);
      const event = await createEvent({
        data: {
          title, slug: finalSlug, eventType,
          date: date || null, venue: venue || null,
          welcomeMessage: welcomeMessage || null,
          revealAt: revealAt || null,
          coverDataUrl: cover, invitationDataUrl: invitation,
          customData: Object.keys(customValues).length ? customValues : null,
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

  function renderField(f: CreateEventField) {
    if (!f.visible) return null;
    if (f.key === "title") {
      return (
        <Field key={f.key} label={labelFor(f)}>
          <input required={f.required} value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none focus:border-gold"
            placeholder={f.placeholder ?? ""} />
        </Field>
      );
    }
    if (f.key === "slug") {
      return (
        <Field key={f.key} label={labelFor(f)}>
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
                  className="flex-1 rounded-lg border border-ink/15 bg-card px-3 py-1.5 font-mono text-sm text-ink outline-none focus:border-gold"
                  placeholder="aisha-daniel" />
                <button type="button" onClick={() => setEditingSlug(false)}
                  className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-xs text-cream">
                  <Check size={12} /> Done
                </button>
              </div>
            )}
            {f.helpText && <p className="mt-1 text-[11px] text-ink/55">{f.helpText}</p>}
          </div>
        </Field>
      );
    }
    if (f.key === "eventType") {
      const opts = f.options ?? ["wedding", "birthday", "party", "travel", "ceremony"];
      return (
        <Field key={f.key} label={labelFor(f)}>
          <select value={eventType} onChange={(e) => setEventType(e.target.value as typeof eventType)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none">
            {opts.map((o) => <option key={o} value={o}>{o[0].toUpperCase() + o.slice(1)}</option>)}
          </select>
        </Field>
      );
    }
    if (f.key === "date") {
      return (
        <Field key={f.key} label={labelFor(f)}>
          <input type="date" required={f.required} value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none" />
        </Field>
      );
    }
    if (f.key === "venue") {
      return (
        <Field key={f.key} label={labelFor(f)}>
          <input required={f.required} value={venue} onChange={(e) => setVenue(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none"
            placeholder={f.placeholder ?? ""} />
        </Field>
      );
    }
    if (f.key === "welcomeMessage") {
      return (
        <Field key={f.key} label={labelFor(f)}>
          <textarea required={f.required} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={3}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none"
            placeholder={f.placeholder ?? ""} />
        </Field>
      );
    }
    if (f.key === "revealAt") {
      return (
        <Field key={f.key} label={labelFor(f)}>
          <input type="datetime-local" value={revealAt} onChange={(e) => setRevealAt(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none" />
        </Field>
      );
    }
    if (f.key === "cover") {
      return <ImageField key={f.key} label={labelFor(f)} value={cover} onChange={(file) => handleImage(file, setCover)} />;
    }
    if (f.key === "invitation") {
      return <ImageField key={f.key} label={labelFor(f)} value={invitation} onChange={(file) => handleImage(file, setInvitation)} />;
    }
    // Custom (admin-defined) field
    const v = customValues[f.key] ?? "";
    const setV = (val: string) => setCustomValues((c) => ({ ...c, [f.key]: val }));
    if (f.type === "textarea") {
      return (
        <Field key={f.key} label={labelFor(f)} help={f.helpText}>
          <textarea required={f.required} value={v} onChange={(e) => setV(e.target.value)} rows={3}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none"
            placeholder={f.placeholder ?? ""} />
        </Field>
      );
    }
    if (f.type === "select") {
      return (
        <Field key={f.key} label={labelFor(f)} help={f.helpText}>
          <select required={f.required} value={v} onChange={(e) => setV(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none">
            <option value="">Select…</option>
            {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
      );
    }
    if (f.type === "date" || f.type === "datetime") {
      return (
        <Field key={f.key} label={labelFor(f)} help={f.helpText}>
          <input type={f.type === "date" ? "date" : "datetime-local"} required={f.required}
            value={v} onChange={(e) => setV(e.target.value)}
            className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none" />
        </Field>
      );
    }
    if (f.type === "image") {
      // Custom image fields are stored as data URLs in custom_data (not uploaded).
      return (
        <Field key={f.key} label={labelFor(f)} help={f.helpText}>
          <input type="file" accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try { setV(await resizeImageToDataUrl(file)); }
              catch { toast.error("Could not read image"); }
            }}
            className="w-full text-sm text-ink/70" />
          {v && <img src={v} alt="preview" className="mt-2 max-h-40 rounded-lg" />}
        </Field>
      );
    }
    // default: text
    return (
      <Field key={f.key} label={labelFor(f)} help={f.helpText}>
        <input required={f.required} value={v} onChange={(e) => setV(e.target.value)}
          className="w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-ink outline-none"
          placeholder={f.placeholder ?? ""} />
      </Field>
    );
  }

  function labelFor(f: CreateEventField) {
    return f.required ? `${f.label} *` : `${f.label}${f.key === "welcomeMessage" || f.key === "venue" || f.key === "revealAt" || f.key === "slug" ? "" : ""}`;
  }

  return (
    <div className="mx-auto max-w-2xl py-4">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink/70 hover:text-ink">
        <ArrowLeft size={14} /> Back
      </Link>
      <h1 className="mt-4 font-serif text-4xl italic">Create event</h1>
      <p className="mt-1 text-ink/65">A single QR code becomes your guests' way in.</p>

      <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-ink/10 bg-card p-6">
        {(formConfig?.fields ?? []).map(renderField)}

        <button disabled={busy} type="submit"
          className="mt-2 w-full rounded-xl bg-ink py-3 text-sm tracking-wider text-cream disabled:opacity-60">
          {busy ? "Creating…" : "CREATE EVENT →"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      <div className="mt-1">{children}</div>
      {help && <p className="mt-1 text-[11px] text-ink/55">{help}</p>}
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
