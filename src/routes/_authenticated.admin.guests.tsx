import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listAllGuests, adminDeleteGuest, adminUpdateGuest } from "@/lib/kenangan.functions";
import { toast } from "sonner";
import { Pencil, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/guests")({
  component: AdminGuests,
});

function AdminGuests() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-guests"], queryFn: () => listAllGuests() });
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  const events = useMemo(() => {
    const set = new Map<string, string>();
    for (const g of data ?? []) {
      const ev = (g as { events?: { title?: string } }).events;
      if (g.event_id && ev?.title) set.set(g.event_id, ev.title);
    }
    return Array.from(set, ([id, title]) => ({ id, title }));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((g) => {
      if (eventFilter && g.event_id !== eventFilter) return false;
      if (!q) return true;
      const ev = (g as { events?: { title?: string } }).events?.title ?? "";
      return g.name.toLowerCase().includes(q) || ev.toLowerCase().includes(q);
    });
  }, [data, search, eventFilter]);

  async function remove(id: string, name: string) {
    if (!confirm(`Delete guest "${name}"?`)) return;
    try {
      await adminDeleteGuest({ data: { guestId: id } });
      toast.success("Guest deleted");
      qc.invalidateQueries({ queryKey: ["admin-guests"] });
    } catch (err) { toast.error((err as Error).message); }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await adminUpdateGuest({ data: { guestId: editing.id, name: editing.name } });
      toast.success("Guest updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-guests"] });
    } catch (err) { toast.error((err as Error).message); }
  }

  if (isLoading) return <p className="text-ink/60">Loading…</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guests or events…"
          className="flex-1 min-w-[200px] rounded-full border border-ink/15 bg-card px-4 py-2 text-sm" />
        <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}
          className="rounded-full border border-ink/15 bg-card px-3 py-2 text-sm">
          <option value="">All events</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-cream-deep/60 text-left text-[10px] uppercase tracking-wider text-ink/60">
            <tr><th className="px-4 py-3">Guest</th><th>Event</th><th>Joined</th><th className="px-4 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map((g) => {
              const isEditing = editing?.id === g.id;
              return (
                <tr key={g.id} className="border-t border-ink/5">
                  <td className="px-4 py-3 font-serif italic">
                    {isEditing ? (
                      <input value={editing!.name} onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
                        autoFocus className="rounded-lg border border-ink/20 bg-cream/70 px-2 py-1 text-sm not-italic" />
                    ) : g.name}
                  </td>
                  <td className="text-ink/70">{(g as { events?: { title?: string } }).events?.title ?? "—"}</td>
                  <td className="text-ink/60">{new Date(g.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="inline-flex gap-1">
                        <button onClick={saveEdit} className="grid h-7 w-7 place-items-center rounded-full bg-ink text-cream"><Check size={14} /></button>
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
            {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-ink/55">No guests match</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
