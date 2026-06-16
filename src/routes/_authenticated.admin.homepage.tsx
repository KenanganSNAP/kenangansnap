import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getHomepageSettings, updateHomepageSettings, type HomepageSettings } from "@/lib/kenangan.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  component: AdminHomepage,
});

function Field({ label, value, onChange, textarea = false, max }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; max?: number }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      {textarea ? (
        <textarea
          value={value} onChange={(e) => onChange(e.target.value)} maxLength={max} rows={3}
          className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold"
        />
      ) : (
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={max}
          className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold"
        />
      )}
    </label>
  );
}

function AdminHomepage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["homepage-settings"], queryFn: () => getHomepageSettings() });
  const [s, setS] = useState<HomepageSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data && !s) setS(data); }, [data, s]);

  if (isLoading || !s) return <p className="text-ink/60">Loading…</p>;

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      await updateHomepageSettings({ data: { settings: s } });
      toast.success("Homepage updated");
      qc.invalidateQueries({ queryKey: ["homepage-settings"] });
      qc.invalidateQueries({ queryKey: ["homepage-public"] });
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }

  function update<K extends keyof HomepageSettings>(k: K, v: HomepageSettings[K]) {
    setS((prev) => prev ? { ...prev, [k]: v } : prev);
  }
  function updateFeature(i: number, field: "title" | "body", v: string) {
    setS((prev) => {
      if (!prev) return prev;
      const features = prev.features.map((f, idx) => idx === i ? { ...f, [field]: v } : f);
      return { ...prev, features };
    });
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
        <button onClick={save} disabled={saving} className="rounded-full bg-ink px-6 py-3 text-sm text-cream disabled:opacity-60">
          {saving ? "Saving…" : "Save homepage"}
        </button>
      </div>
    </div>
  );
}
