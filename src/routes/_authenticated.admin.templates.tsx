import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  listAllTemplates, upsertTemplate, deleteTemplate, reorderTemplate,
  type TemplateKind, type TemplateRow,
} from "@/lib/templates.functions";
import { resizeImageToDataUrl } from "@/lib/image-resize";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/templates")({
  component: AdminTemplates,
});

function AdminTemplates() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: () => listAllTemplates(),
  });
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [adding, setAdding] = useState(false);

  function refresh() { qc.invalidateQueries({ queryKey: ["admin-templates"] }); }

  async function toggleActive(t: TemplateRow) {
    await upsertTemplate({ data: { id: t.id, name: t.name, kind: t.kind, assetDataUrl: null, previewDataUrl: null, isActive: !t.is_active } });
    refresh();
  }
  async function move(id: string, direction: "up" | "down") {
    await reorderTemplate({ data: { id, direction } });
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    await deleteTemplate({ data: { id } });
    refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink/65">PNG with transparency works best. Templates appear in the booth as frames or overlays.</p>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-sm text-cream">
          <Plus size={14} /> New template
        </button>
      </div>
      {isLoading ? <p className="text-ink/60">Loading…</p> : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 bg-card/60 px-4 py-8 text-center text-sm text-ink/55">
          No templates yet. Add your first one.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <li key={t.id} className="rounded-2xl border border-ink/10 bg-card p-3">
              <div className="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:20px_20px]">
                {(t.preview_url ?? t.asset_url) ? (
                  <img src={t.preview_url ?? t.asset_url ?? ""} alt={t.name} className="h-full w-full object-contain" />
                ) : <span className="text-xs text-ink/50">No preview</span>}
                {!t.is_active && <div className="absolute inset-0 grid place-items-center bg-ink/40 text-xs uppercase tracking-wider text-cream">Hidden</div>}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-serif italic">{t.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-ink/55">{t.kind}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Btn onClick={() => move(t.id, "up")} disabled={i === 0}><ArrowUp size={12} /></Btn>
                  <Btn onClick={() => move(t.id, "down")} disabled={i === items.length - 1}><ArrowDown size={12} /></Btn>
                  <Btn onClick={() => toggleActive(t)}>{t.is_active ? <EyeOff size={12} /> : <Eye size={12} />}</Btn>
                  <Btn onClick={() => setEditing(t)}>Edit</Btn>
                  <Btn onClick={() => remove(t.id)} danger><Trash2 size={12} /></Btn>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(adding || editing) && (
        <TemplateForm
          initial={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function Btn({ children, onClick, danger, disabled }: { children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs disabled:opacity-30 ${danger ? "bg-red-500/10 text-red-600" : "bg-cream/80 text-ink hover:bg-cream"}`}>
      {children}
    </button>
  );
}

function TemplateForm({ initial, onClose, onSaved }: { initial: TemplateRow | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<TemplateKind>(initial?.kind ?? "frame");
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const assetRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLInputElement>(null);

  async function pickAsset(file: File) {
    if (file.size > 8 * 1024 * 1024) return toast.error("Asset must be under 8 MB");
    // Keep PNG transparency: use original data URL for PNG, resize others
    if (file.type === "image/png") {
      const reader = new FileReader();
      reader.onload = () => setAssetUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      const d = await resizeImageToDataUrl(file, 1600);
      setAssetUrl(d);
    }
  }
  async function pickPreview(file: File) {
    const d = await resizeImageToDataUrl(file, 600);
    setPreviewUrl(d);
  }

  async function save() {
    if (!name.trim()) return toast.error("Name required");
    if (!initial && !assetUrl) return toast.error("Upload the template image");
    setBusy(true);
    try {
      await upsertTemplate({ data: { id: initial?.id ?? null, name: name.trim(), kind, assetDataUrl: assetUrl, previewDataUrl: previewUrl, isActive: active } });
      toast.success("Saved");
      onSaved();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-serif text-2xl italic">{initial ? "Edit template" : "New template"}</h2>
        <div className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink/55">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink/55">Kind</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as TemplateKind)} className="mt-1 w-full rounded-lg border border-ink/15 bg-cream px-3 py-2">
              <option value="frame">Frame (outer border)</option>
              <option value="overlay">Overlay (anywhere)</option>
            </select>
          </label>
          <div>
            <span className="text-xs uppercase tracking-wider text-ink/55">Template PNG {initial ? "(leave to keep current)" : "*"}</span>
            <button onClick={() => assetRef.current?.click()} className="mt-1 w-full rounded-lg border border-dashed border-ink/25 px-3 py-2 text-left">
              {assetUrl ? "Replace selected" : initial ? "Choose new file" : "Choose file"}
            </button>
            <input ref={assetRef} type="file" accept="image/png,image/webp" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickAsset(f); }} />
            {assetUrl && <img src={assetUrl} alt="" className="mt-2 max-h-32 rounded border border-ink/10 bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:20px_20px]" />}
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-ink/55">Preview thumbnail (optional)</span>
            <button onClick={() => previewRef.current?.click()} className="mt-1 w-full rounded-lg border border-dashed border-ink/25 px-3 py-2 text-left">
              {previewUrl ? "Replace preview" : "Auto from asset"}
            </button>
            <input ref={previewRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickPreview(f); }} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Active (visible to hosts and guests)</span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-ink/15 px-4 py-2 text-sm">Cancel</button>
          <button disabled={busy} onClick={save} className="rounded-full bg-ink px-4 py-2 text-sm text-cream disabled:opacity-60">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
