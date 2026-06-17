import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getAdminEventDetail, adminUpdateEvent } from "@/lib/admin-events.functions";
import { listEventGuestsForAdmin, adminUpdateGuest, adminDeleteGuest } from "@/lib/kenangan.functions";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Check, X } from "lucide-react";

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
  max_guests: number;
  max_photos: number;
  max_notes: number;
  max_voice: number;
  max_prints: number;
};

function toDateInput(v: string | null) { return v ? v.slice(0, 10) : ""; }
function toDateTimeInput(v: string | null) { return v ? new Date(v).toISOString().slice(0, 16) : ""; }

function AdminEventDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-event", id], queryFn: () => getAdminEventDetail({ data: { id } }) });
  const [form, setForm] = useState<EditableValues | null>(null);
  const [tab, setTab] = useState<"overview" | "guests">("overview");

  useEffect(() => {
    if (data && !form) {
      const e = data.event;
      setForm({
        title: e.title, event_type: e.event_type as EditableValues["event_type"],
        date: e.date, venue: e.venue, welcome_message: e.welcome_message,
        reveal_at: e.reveal_at, status: (e.status as EditableValues["status"]) ?? "draft",
        max_guests: e.max_guests ?? 50,
        max_photos: e.max_photos ?? 100,
        max_notes: e.max_notes ?? 100,
        max_voice: e.max_voice ?? 50,
        max_prints: e.max_prints ?? 20,
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

      <div className="flex gap-1 rounded-full border border-ink/10 bg-card p-1 text-sm">
        {(["overview", "guests"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 rounded-full px-4 py-2 capitalize ${tab === k ? "bg-ink text-cream" : "text-ink/70"}`}>{k}</button>
        ))}
      </div>

      {tab === "guests" ? (
        <GuestsPanel eventId={id} />
      ) : (
      <>
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

      <section className="space-y-3 rounded-2xl border border-ink/10 bg-card p-5">
        <h2 className="font-serif text-xl italic">Capacity limits</h2>
        <p className="text-xs text-ink/55">Admin-only. Guests will be blocked once a cap is hit.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberInput label="Max guests (min 50)" min={50} value={form.max_guests} onChange={(n) => setForm({ ...form, max_guests: n })} />
          <NumberInput label="Max photos" min={1} value={form.max_photos} onChange={(n) => setForm({ ...form, max_photos: n })} />
          <NumberInput label="Max notes" min={1} value={form.max_notes} onChange={(n) => setForm({ ...form, max_notes: n })} />
          <NumberInput label="Max voice messages" min={1} value={form.max_voice} onChange={(n) => setForm({ ...form, max_voice: n })} />
          <NumberInput label="Max prints" min={0} value={form.max_prints} onChange={(n) => setForm({ ...form, max_prints: n })} />
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
      </>
      )}
    </div>
  );
}

function GuestsPanel({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-event-guests", eventId],
    queryFn: () => listEventGuestsForAdmin({ data: { eventId } }),
  });
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  async function save() {
    if (!editing) return;
    try {
      await adminUpdateGuest({ data: { guestId: editing.id, name: editing.name } });
      toast.success("Guest updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-event-guests", eventId] });
      qc.invalidateQueries({ queryKey: ["admin-event", eventId] });
    } catch (err) { toast.error((err as Error).message); }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete guest "${name}"?`)) return;
    try {
      await adminDeleteGuest({ data: { guestId: id } });
      toast.success("Guest deleted");
      qc.invalidateQueries({ queryKey: ["admin-event-guests", eventId] });
      qc.invalidateQueries({ queryKey: ["admin-event", eventId] });
    } catch (err) { toast.error((err as Error).message); }
  }

  if (isLoading) return <p className="text-ink/60">Loading guests…</p>;
  const guests = data ?? [];
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-cream-deep/60 text-left text-[10px] uppercase tracking-wider text-ink/60">
          <tr><th className="px-4 py-3">Guest</th><th>Photos</th><th>Joined</th><th className="px-4 text-right">Actions</th></tr>
        </thead>
        <tbody>
          {guests.map((g) => {
            const isEditing = editing?.id === g.id;
            return (
              <tr key={g.id} className="border-t border-ink/5">
                <td className="px-4 py-3 font-serif italic">
                  {isEditing ? (
                    <input value={editing!.name} onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
                      autoFocus className="rounded-lg border border-ink/20 bg-cream/70 px-2 py-1 text-sm not-italic" />
                  ) : g.name}
                </td>
                <td className="text-ink/70">{g.photo_count}</td>
                <td className="text-ink/60">{new Date(g.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {isEditing ? (
                    <div className="inline-flex gap-1">
                      <button onClick={save} className="grid h-7 w-7 place-items-center rounded-full bg-ink text-cream"><Check size={14} /></button>
                      <button onClick={() => setEditing(null)} className="grid h-7 w-7 place-items-center rounded-full border border-ink/15"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="inline-flex gap-2">
                      <button onClick={() => setEditing({ id: g.id, name: g.name })}
                        className="inline-flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1 text-ink/70"><Pencil size={12} /> Edit</button>
                      <button onClick={() => remove(g.id, g.name)} className="rounded-full bg-red-600/10 px-3 py-1 text-red-700">Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {guests.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-ink/55">No guests yet</td></tr>}
        </tbody>
      </table>
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

function NumberInput({ label, value, onChange, min }: { label: string; value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      <input type="number" min={min} value={value} onChange={(e) => onChange(Math.max(min ?? 0, Number(e.target.value) || 0))} className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm" />
    </label>
  );
}
