import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getHomepageSettings, updateHomepageSettings, type HomepageSettings } from "@/lib/kenangan.functions";
import {
  listHomepageMedia, addHomepageMedia, deleteHomepageMedia, setHomepageHero, reorderHomepageMedia,
  listTestimonials, upsertTestimonial, deleteTestimonial,
  getHomepageExtras, updateHomepageExtras,
} from "@/lib/cms.functions";
import { resizeImageToDataUrl } from "@/lib/image-resize";
import { toast } from "sonner";
import { Trash2, Star, ArrowUp, ArrowDown, Plus, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: AdminHomepage,
});

function Field({ label, value, onChange, textarea = false, max }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; max?: number }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={max} rows={3}
          className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={max}
          className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold" />
      )}
    </label>
  );
}

function AdminHomepage() {
  return (
    <div className="space-y-10">
      <HeroAndFeatures />
      <FeaturedVideoSection />
      <FeaturedPhotosSection />
      <TestimonialsSection />
    </div>
  );
}

function HeroAndFeatures() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["homepage-settings"], queryFn: () => getHomepageSettings() });
  const [s, setS] = useState<HomepageSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data && !s) setS(data); }, [data, s]);
  if (!s) return <p className="text-ink/60">Loading…</p>;

  function update<K extends keyof HomepageSettings>(k: K, v: HomepageSettings[K]) {
    setS((p) => p ? { ...p, [k]: v } : p);
  }
  function updateFeature(i: number, field: "title" | "body", v: string) {
    setS((p) => p ? { ...p, features: p.features.map((f, idx) => idx === i ? { ...f, [field]: v } : f) } : p);
  }
  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      await updateHomepageSettings({ data: { settings: s } });
      toast.success("Homepage hero updated");
      qc.invalidateQueries({ queryKey: ["homepage-settings"] });
      qc.invalidateQueries({ queryKey: ["homepage-public"] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-ink/10 bg-card p-5">
        <h2 className="font-serif text-xl italic">Hero</h2>
        <div className="mt-4 grid gap-3">
          <Field label="Eyebrow" value={s.hero_eyebrow} onChange={(v) => update("hero_eyebrow", v)} max={120} />
          <Field label="Title line 1" value={s.hero_title_line1} onChange={(v) => update("hero_title_line1", v)} max={120} />
          <Field label="Title line 2 (script)" value={s.hero_title_line2} onChange={(v) => update("hero_title_line2", v)} max={120} />
          <Field label="Subtitle" textarea value={s.hero_subtitle} onChange={(v) => update("hero_subtitle", v)} max={600} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Primary CTA" value={s.cta_primary} onChange={(v) => update("cta_primary", v)} max={60} />
            <Field label="Secondary CTA" value={s.cta_secondary} onChange={(v) => update("cta_secondary", v)} max={60} />
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-ink/10 bg-card p-5">
        <h2 className="font-serif text-xl italic">Features section</h2>
        <div className="mt-4 grid gap-3">
          <Field label="Section title" value={s.section_title} onChange={(v) => update("section_title", v)} max={120} />
          <Field label="Section subtitle" textarea value={s.section_subtitle} onChange={(v) => update("section_subtitle", v)} max={400} />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {s.features.map((f, i) => (
            <div key={i} className="rounded-xl border border-ink/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-ink/50">Feature {i + 1}</div>
              <div className="mt-2 grid gap-2">
                <Field label="Title" value={f.title} onChange={(v) => updateFeature(i, "title", v)} max={60} />
                <Field label="Body" textarea value={f.body} onChange={(v) => updateFeature(i, "body", v)} max={300} />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-ink/10 bg-card p-5">
        <h2 className="font-serif text-xl italic">Footer</h2>
        <div className="mt-4"><Field label="Footer note" value={s.footer_note} onChange={(v) => update("footer_note", v)} max={200} /></div>
      </section>
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="rounded-full bg-ink px-6 py-3 text-sm text-cream disabled:opacity-60">{saving ? "Saving…" : "Save hero & features"}</button>
      </div>
    </div>
  );
}

function FeaturedVideoSection() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["homepage-extras"], queryFn: () => getHomepageExtras() });
  const [url, setUrl] = useState("");
  useEffect(() => { if (data) setUrl(data.video_url); }, [data]);
  const mut = useMutation({
    mutationFn: () => updateHomepageExtras({ data: { settings: { video_url: url } } }),
    onSuccess: () => { toast.success("Video saved"); qc.invalidateQueries({ queryKey: ["homepage-extras"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <section className="rounded-2xl border border-ink/10 bg-card p-5">
      <h2 className="font-serif text-xl italic">Featured video</h2>
      <p className="mt-1 text-xs text-ink/60">Paste a YouTube, Vimeo, or direct .mp4 URL. Leave empty to hide.</p>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…"
        className="mt-3 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm" />
      <div className="mt-3 flex justify-end">
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded-full bg-ink px-5 py-2 text-sm text-cream disabled:opacity-60">{mut.isPending ? "Saving…" : "Save video"}</button>
      </div>
    </section>
  );
}

function FeaturedPhotosSection() {
  const qc = useQueryClient();
  const { data: photos = [] } = useQuery({ queryKey: ["homepage-media"], queryFn: () => listHomepageMedia() });
  const [busy, setBusy] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["homepage-media"] });
  }

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await addHomepageMedia({ data: { dataUrl, caption: null } });
      toast.success("Photo added");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl italic">Featured photos</h2>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs text-cream">
          <Upload size={14} /> {busy ? "Uploading…" : "Add photo"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={busy} />
        </label>
      </div>
      {photos.length === 0 ? (
        <p className="mt-4 text-sm text-ink/55">No featured photos yet.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-ink/10">
              {p.signed_url && <img src={p.signed_url} alt="" className="aspect-square w-full object-cover" />}
              <div className="flex items-center justify-between gap-1 p-2 text-xs">
                {p.is_hero ? <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] text-ink">Hero</span> : <span className="text-ink/50">In gallery</span>}
                <div className="flex gap-1">
                  <button title="Move up" onClick={async () => { await reorderHomepageMedia({ data: { id: p.id, direction: "up" } }); refresh(); }} className="rounded p-1 hover:bg-ink/5"><ArrowUp size={14} /></button>
                  <button title="Move down" onClick={async () => { await reorderHomepageMedia({ data: { id: p.id, direction: "down" } }); refresh(); }} className="rounded p-1 hover:bg-ink/5"><ArrowDown size={14} /></button>
                  <button title="Set as hero" onClick={async () => { await setHomepageHero({ data: { id: p.id } }); toast.success("Set as hero"); refresh(); }} className="rounded p-1 hover:bg-gold/20"><Star size={14} /></button>
                  <button title="Delete" onClick={async () => { if (!confirm("Delete this photo?")) return; await deleteHomepageMedia({ data: { id: p.id } }); refresh(); }} className="rounded p-1 text-red-700 hover:bg-red-500/10"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TestimonialsSection() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["homepage-testimonials"], queryFn: () => listTestimonials() });
  const [editing, setEditing] = useState<{ id: string | null; author_name: string; quote: string; event_name: string; photo_data_url: string | null } | null>(null);

  async function save() {
    if (!editing) return;
    try {
      await upsertTestimonial({ data: { id: editing.id, author_name: editing.author_name, quote: editing.quote, event_name: editing.event_name || null, photo_data_url: editing.photo_data_url } });
      toast.success("Testimonial saved");
      qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
      setEditing(null);
    } catch (e) { toast.error((e as Error).message); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    await deleteTestimonial({ data: { id } });
    qc.invalidateQueries({ queryKey: ["homepage-testimonials"] });
  }
  async function pickPhoto(file: File) {
    if (!editing) return;
    const dataUrl = await resizeImageToDataUrl(file);
    setEditing({ ...editing, photo_data_url: dataUrl });
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl italic">Testimonials</h2>
        <button onClick={() => setEditing({ id: null, author_name: "", quote: "", event_name: "", photo_data_url: null })} className="inline-flex items-center gap-1 rounded-full bg-ink px-4 py-2 text-xs text-cream"><Plus size={14} /> Add</button>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-xl border border-ink/10 p-3">
            {t.signed_url ? <img src={t.signed_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-ink/10" />}
            <div className="flex-1">
              <div className="text-sm font-medium">{t.author_name} {t.event_name && <span className="text-xs text-ink/55">· {t.event_name}</span>}</div>
              <p className="text-sm italic text-ink/80">“{t.quote}”</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setEditing({ id: t.id, author_name: t.author_name, quote: t.quote, event_name: t.event_name ?? "", photo_data_url: null })} className="rounded-full border border-ink/15 px-3 py-1 text-xs">Edit</button>
              <button onClick={() => remove(t.id)} className="rounded p-1 text-red-700 hover:bg-red-500/10"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-ink/55">No testimonials yet.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-lg italic">{editing.id ? "Edit testimonial" : "New testimonial"}</h3>
            <div className="mt-3 space-y-3">
              <Field label="Author name" value={editing.author_name} onChange={(v) => setEditing({ ...editing, author_name: v })} max={80} />
              <Field label="Event name (optional)" value={editing.event_name} onChange={(v) => setEditing({ ...editing, event_name: v })} max={120} />
              <Field label="Quote" textarea value={editing.quote} onChange={(v) => setEditing({ ...editing, quote: v })} max={600} />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/15 px-3 py-1.5 text-xs">
                <Upload size={14} /> {editing.photo_data_url ? "Photo selected" : "Author photo"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pickPhoto(e.target.files[0])} />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-full px-4 py-2 text-sm text-ink/70">Cancel</button>
              <button onClick={save} className="rounded-full bg-ink px-5 py-2 text-sm text-cream">Save</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
