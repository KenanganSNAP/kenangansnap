import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPage, updatePage, uploadSiteAsset } from "@/lib/cms.functions";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { resizeImageToDataUrl } from "@/lib/image-resize";

type PageKey = "pricing_page" | "how_it_works_page" | "about_page";

function TextInput({ label, value, onChange, textarea, max }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; max?: number }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      {textarea ? (
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} maxLength={max} rows={3}
          className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold" />
      ) : (
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} maxLength={max}
          className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold" />
      )}
    </label>
  );
}

function ImagePicker({ label, currentSignedUrl, onUploaded, folder }: { label: string; currentSignedUrl: string | null; onUploaded: (path: string) => void; folder: string }) {
  const [busy, setBusy] = useState(false);
  async function pick(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const { path } = await uploadSiteAsset({ data: { folder, dataUrl } });
      onUploaded(path);
      toast.success("Image uploaded");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-ink/60">{label}</div>
      <div className="mt-2 flex items-center gap-3">
        {currentSignedUrl ? <img src={currentSignedUrl} alt="" className="h-16 w-24 rounded-lg object-cover" /> : <div className="h-16 w-24 rounded-lg bg-ink/10" />}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/15 bg-cream px-3 py-1.5 text-xs">
          <Upload size={14} /> {busy ? "Uploading…" : "Change"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} disabled={busy} />
        </label>
      </div>
    </div>
  );
}

type AnyItem = Record<string, unknown>;

export function PageEditor({ pageKey, title, itemKey, itemFields, itemLabel, makeEmpty, extraTopFields, extraBottomFields }: {
  pageKey: PageKey;
  title: string;
  itemKey: string; // "tiers" | "steps" | "team"
  itemFields: { key: string; label: string; type: "text" | "textarea" | "image" | "boolean" | "list"; folder?: string }[];
  itemLabel: (i: number, it: AnyItem) => string;
  makeEmpty: () => AnyItem;
  extraTopFields?: { key: string; label: string; type: "text" | "textarea" }[];
  extraBottomFields?: { key: string; label: string; type: "text" | "textarea" }[];
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["page", pageKey], queryFn: () => getPage({ data: { key: pageKey } }) });
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { if (data && !draft) setDraft({ ...data }); }, [data, draft]);

  const mut = useMutation({
    mutationFn: () => updatePage({ data: { key: pageKey, settings: stripSigned(draft!) } }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["page", pageKey] });
      setDraft(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading || !draft) return <p className="text-ink/60">Loading…</p>;

  const hero = (draft.hero as { title: string; subtitle: string; image_path: string | null }) ?? { title: "", subtitle: "", image_path: null };
  const items = (draft[itemKey] as AnyItem[]) ?? [];
  const signed = (draft._signed as Record<string, string | null>) ?? {};

  function setHero<K extends keyof typeof hero>(k: K, v: (typeof hero)[K]) {
    setDraft({ ...draft, hero: { ...hero, [k]: v } });
  }
  function setItem(i: number, k: string, v: unknown) {
    const next = items.map((it, idx) => idx === i ? { ...it, [k]: v } : it);
    setDraft({ ...draft, [itemKey]: next });
  }
  function moveItem(i: number, dir: -1 | 1) {
    const j = i + dir; if (j < 0 || j >= items.length) return;
    const next = [...items]; [next[i], next[j]] = [next[j], next[i]];
    setDraft({ ...draft, [itemKey]: next });
  }
  function removeItem(i: number) {
    setDraft({ ...draft, [itemKey]: items.filter((_, idx) => idx !== i) });
  }
  function addItem() { setDraft({ ...draft, [itemKey]: [...items, makeEmpty()] }); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl italic">{title}</h1>
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded-full bg-ink px-6 py-2.5 text-sm text-cream disabled:opacity-60">{mut.isPending ? "Saving…" : "Save"}</button>
      </div>

      <section className="space-y-3 rounded-2xl border border-ink/10 bg-card p-5">
        <h2 className="font-serif text-xl italic">Hero</h2>
        <TextInput label="Title" value={hero.title} onChange={(v) => setHero("title", v)} max={120} />
        <TextInput label="Subtitle" textarea value={hero.subtitle} onChange={(v) => setHero("subtitle", v)} max={400} />
        <ImagePicker label="Hero image" folder="cms" currentSignedUrl={signed["hero"] ?? null} onUploaded={(path) => setHero("image_path", path)} />
        {extraTopFields?.map((f) => (
          <TextInput key={f.key} label={f.label} textarea={f.type === "textarea"} value={(draft[f.key] as string) ?? ""} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border border-ink/10 bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl italic">{itemKey === "tiers" ? "Pricing tiers" : itemKey === "steps" ? "Steps" : "Team"}</h2>
          <button onClick={addItem} className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1 text-xs"><Plus size={14} /> Add</button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-ink/10 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-ink/55">{itemLabel(i, it)}</div>
              <div className="flex gap-1">
                <button onClick={() => moveItem(i, -1)} className="rounded p-1 hover:bg-ink/5"><ArrowUp size={14} /></button>
                <button onClick={() => moveItem(i, 1)} className="rounded p-1 hover:bg-ink/5"><ArrowDown size={14} /></button>
                <button onClick={() => removeItem(i)} className="rounded p-1 text-red-700 hover:bg-red-500/10"><Trash2 size={14} /></button>
              </div>
            </div>
            {itemFields.map((f) => {
              const val = it[f.key];
              if (f.type === "text" || f.type === "textarea") {
                return <TextInput key={f.key} label={f.label} textarea={f.type === "textarea"} value={(val as string) ?? ""} onChange={(v) => setItem(i, f.key, v)} />;
              }
              if (f.type === "boolean") {
                return (
                  <label key={f.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!val} onChange={(e) => setItem(i, f.key, e.target.checked)} /> {f.label}
                  </label>
                );
              }
              if (f.type === "list") {
                const list = (val as string[]) ?? [];
                return (
                  <div key={f.key}>
                    <div className="text-xs uppercase tracking-wider text-ink/60">{f.label}</div>
                    <div className="mt-2 space-y-2">
                      {list.map((s, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input value={s} onChange={(e) => { const n = [...list]; n[idx] = e.target.value; setItem(i, f.key, n); }}
                            className="flex-1 rounded-lg border border-ink/15 bg-cream/70 px-3 py-1.5 text-sm" />
                          <button onClick={() => setItem(i, f.key, list.filter((_, k) => k !== idx))} className="rounded p-1 text-red-700"><Trash2 size={14} /></button>
                        </div>
                      ))}
                      <button onClick={() => setItem(i, f.key, [...list, ""])} className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1 text-xs"><Plus size={12} /> Add line</button>
                    </div>
                  </div>
                );
              }
              if (f.type === "image") {
                const sigKey = `${itemKey === "steps" ? "step" : "team"}_${i}`;
                return <ImagePicker key={f.key} label={f.label} folder={f.folder ?? "cms"} currentSignedUrl={signed[sigKey] ?? null} onUploaded={(path) => setItem(i, f.key, path)} />;
              }
              return null;
            })}
          </div>
        ))}
      </section>

      {extraBottomFields && extraBottomFields.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-ink/10 bg-card p-5">
          {extraBottomFields.map((f) => (
            <TextInput key={f.key} label={f.label} textarea={f.type === "textarea"} value={(draft[f.key] as string) ?? ""} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
          ))}
        </section>
      )}
    </div>
  );
}

function stripSigned(d: Record<string, unknown>) {
  const copy: Record<string, unknown> = { ...d };
  delete copy._signed;
  return copy;
}
