import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAdminEventDetail, adminUpdateEvent } from "@/lib/admin-events.functions";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/events/$id")({
  component: AdminEventDetail,
});

type EditableValues = {
  title: string;
  event_type: "wedding" | "birthday" | "party" | "travel" | "ceremony";
  date: string | null;
  venue: string | null;
  welcome_message: string | null;
  reveal_at: string | null;
  status: "draft" | "active" | "completed" | "cancelled";
};

function toDateInput(v: string | null) { return v ? v.slice(0, 10) : ""; }
function toDateTimeInput(v: string | null) { return v ? new Date(v).toISOString().slice(0, 16) : ""; }

function AdminEventDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-event", id], queryFn: () => getAdminEventDetail({ data: { id } }) });
  const [form, setForm] = useState<EditableValues | null>(null);

  useEffect(() => {
    if (data && !form) {
      const e = data.event;
      setForm({
        title: e.title, event_type: e.event_type as EditableValues["event_type"],
        date: e.date, venue: e.venue, welcome_message: e.welcome_message,
        reveal_at: e.reveal_at, status: (e.status as EditableValues["status"]) ?? "active",
      });
    }
  }, [data, form]);

  const mut = useMutation({
    mutationFn: () => adminUpdateEvent({ data: { id, changes: form! } }),
    onSuccess: (r) => {
      if (r.changed === 0) toast.info("No changes");
      else toast.success(`Saved (${r.changed} field${r.changed > 1 ? "s" : ""})`);
      qc.invalidateQueries({ queryKey: ["admin-event", id] });
      qc.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (isLoading || !data || !form) return <p className="text-ink/60">Loading…</p>;
  const { counts, host, audits } = data;

  return (
    <div className="space-y-5">
      <Link to="/admin/events" className="inline-flex items-center gap-1 text-sm text-ink/70"><ArrowLeft size={14} /> Back to events</Link>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Guests" value={counts.guests} />
        <Stat label="Photos" value={counts.photos} />
        <Stat label="Memories" value={counts.memories} />
      </div>

      <section className="rounded-2xl border border-ink/10 bg-card p-5">
        <h2 className="font-serif text-xl italic">Host</h2>
        <p className="mt-2 text-sm text-ink/75">{host?.email ?? "—"} <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-xs">{host?.status ?? "—"}</span></p>
      </section>

      <section className="space-y-3 rounded-2xl border border-ink/10 bg-card p-5">
        <h2 className="font-serif text-xl italic">Event details</h2>
        <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Type" value={form.event_type} options={["wedding", "birthday", "party", "travel", "ceremony"]} onChange={(v) => setForm({ ...form, event_type: v as EditableValues["event_type"] })} />
          <Select label="Status" value={form.status} options={["draft", "active", "completed", "cancelled"]} onChange={(v) => setForm({ ...form, status: v as EditableValues["status"] })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Date" type="date" value={toDateInput(form.date)} onChange={(v) => setForm({ ...form, date: v || null })} />
          <Input label="Reveal at" type="datetime-local" value={toDateTimeInput(form.reveal_at)} onChange={(v) => setForm({ ...form, reveal_at: v ? new Date(v).toISOString() : null })} />
        </div>
        <Input label="Venue" value={form.venue ?? ""} onChange={(v) => setForm({ ...form, venue: v || null })} />
        <Input label="Welcome message" textarea value={form.welcome_message ?? ""} onChange={(v) => setForm({ ...form, welcome_message: v || null })} />
        <div className="flex justify-end">
          <button onClick={() => mut.mutate()} disabled={mut.isPending} className="rounded-full bg-ink px-6 py-2.5 text-sm text-cream disabled:opacity-60">{mut.isPending ? "Saving…" : "Save (logged as admin edit)"}</button>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-card p-5">
        <h2 className="font-serif text-xl italic">Audit trail</h2>
        {audits.length === 0 ? (
          <p className="mt-3 text-sm text-ink/55">No admin edits yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {audits.map((a) => (
              <li key={a.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <div className="text-xs text-ink/55">{new Date(a.created_at).toLocaleString()} · {a.note ?? "Edit"}</div>
                <ul className="mt-2 space-y-1 text-xs">
                  {Object.entries(a.changed_fields as Record<string, { from: unknown; to: unknown }>).map(([k, v]) => (
                    <li key={k}><b>{k}:</b> <span className="text-ink/55 line-through">{String(v.from ?? "—")}</span> → <span>{String(v.to ?? "—")}</span></li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-ink/10 bg-card p-4 text-center"><div className="text-2xl font-semibold">{value}</div><div className="text-[10px] uppercase tracking-wider text-ink/55">{label}</div></div>;
}
function Input({ label, value, onChange, type, textarea }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm" />
      ) : (
        <input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm" />
      )}
    </label>
  );
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm capitalize">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
