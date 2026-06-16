import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Plus, Save } from "lucide-react";
import {
  getCreateEventForm,
  updateCreateEventForm,
  type CreateEventField,
  type CreateEventFieldType,
} from "@/lib/cms.functions";

export const Route = createFileRoute("/_authenticated/admin/pages/create-event-form")({
  component: CreateEventFormEditor,
});

const TYPES: CreateEventFieldType[] = ["text", "textarea", "date", "datetime", "select", "image"];

function CreateEventFormEditor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-create-event-form"],
    queryFn: () => getCreateEventForm(),
  });
  const save = useServerFn(updateCreateEventForm);
  const [fields, setFields] = useState<CreateEventField[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data) setFields(data.fields); }, [data]);

  function update(i: number, patch: Partial<CreateEventField>) {
    setFields((arr) => arr.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function move(i: number, dir: -1 | 1) {
    setFields((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = [...arr];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }
  function addCustom() {
    const key = `custom_${Math.random().toString(36).slice(2, 6)}`;
    setFields((arr) => [...arr, {
      key, label: "New field", type: "text", required: false, visible: true, builtin: false,
    }]);
  }
  function remove(i: number) {
    setFields((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function onSave() {
    setBusy(true);
    try {
      await save({ data: { config: { fields } } });
      toast.success("Form saved");
      refetch();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="text-ink/60">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl italic">Create-event form</h2>
          <p className="text-sm text-ink/65">Reorder, relabel, hide, or require built-in fields. Add custom fields stored per event.</p>
        </div>
        <button onClick={onSave} disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-cream disabled:opacity-60">
          <Save size={14} /> {busy ? "Saving…" : "Save"}
        </button>
      </header>

      <ol className="space-y-3">
        {fields.map((f, i) => (
          <li key={f.key} className="rounded-2xl border border-ink/10 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-cream-deep px-2 py-0.5 font-mono text-[10px] text-ink/70">{f.key}</span>
                  {f.builtin
                    ? <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] text-ink/80">built-in</span>
                    : <span className="rounded-full border border-ink/20 px-2 py-0.5 text-[10px] text-ink/70">custom</span>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldRow label="Label">
                    <input value={f.label} onChange={(e) => update(i, { label: e.target.value })}
                      className="w-full rounded-lg border border-ink/15 bg-cream/70 px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" />
                  </FieldRow>
                  <FieldRow label="Type">
                    <select value={f.type} onChange={(e) => update(i, { type: e.target.value as CreateEventFieldType })}
                      disabled={f.builtin}
                      className="w-full rounded-lg border border-ink/15 bg-cream/70 px-3 py-1.5 text-sm text-ink outline-none disabled:opacity-60">
                      {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Placeholder">
                    <input value={f.placeholder ?? ""} onChange={(e) => update(i, { placeholder: e.target.value })}
                      className="w-full rounded-lg border border-ink/15 bg-cream/70 px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" />
                  </FieldRow>
                  <FieldRow label="Help text">
                    <input value={f.helpText ?? ""} onChange={(e) => update(i, { helpText: e.target.value })}
                      className="w-full rounded-lg border border-ink/15 bg-cream/70 px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" />
                  </FieldRow>
                  {f.type === "select" && (
                    <FieldRow label="Options (comma separated)" full>
                      <input value={(f.options ?? []).join(", ")}
                        onChange={(e) => update(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                        className="w-full rounded-lg border border-ink/15 bg-cream/70 px-3 py-1.5 text-sm text-ink outline-none focus:border-gold" />
                    </FieldRow>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-ink/75">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={f.visible} onChange={(e) => update(i, { visible: e.target.checked })} />
                    Visible
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} />
                    Required
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} className="rounded-md border border-ink/15 p-1.5 text-ink/70 hover:bg-ink/5" aria-label="Move up"><ArrowUp size={14} /></button>
                <button onClick={() => move(i, 1)} className="rounded-md border border-ink/15 p-1.5 text-ink/70 hover:bg-ink/5" aria-label="Move down"><ArrowDown size={14} /></button>
                {!f.builtin && (
                  <button onClick={() => remove(i)} className="rounded-md border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10" aria-label="Delete"><Trash2 size={14} /></button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <button onClick={addCustom}
        className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm text-ink/80 hover:bg-ink/5">
        <Plus size={14} /> Add custom field
      </button>
    </div>
  );
}

function FieldRow({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] uppercase tracking-wider text-ink/55">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
