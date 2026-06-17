import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllEvents, adminDeleteEvent } from "@/lib/kenangan.functions";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/events/")({
  component: AdminEvents,
});

function AdminEvents() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-events"], queryFn: () => listAllEvents() });

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}" and all its photos, voices, notes, and guests? This cannot be undone.`)) return;
    try {
      await adminDeleteEvent({ data: { eventId: id } });
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
    } catch (err) { toast.error((err as Error).message); }
  }

  if (isLoading) return <p className="text-ink/60">Loading…</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-cream-deep/60 text-left text-[10px] uppercase tracking-wider text-ink/60">
          <tr><th className="px-4 py-3">Event</th><th>Host</th><th>Type</th><th>Date</th><th>Status</th><th className="px-4 text-right">Actions</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((e) => (
            <tr key={e.id} className="border-t border-ink/5">
              <td className="px-4 py-3 font-serif italic">{e.title}</td>
              <td className="text-ink/70">{e.host_email ?? "—"}</td>
              <td className="text-ink/70">{e.event_type}</td>
              <td className="text-ink/70">{e.date ? new Date(e.date).toLocaleDateString() : "—"}</td>
              <td>
                <StatusBadge status={e.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-2">
                  <Link to="/admin/events/$id" params={{ id: e.id }} className="rounded-full border border-ink/15 px-3 py-1">Edit</Link>
                  <a href={`/event/${e.slug}`} target="_blank" rel="noopener noreferrer" className="text-ink underline">View</a>
                  <button onClick={() => remove(e.id, e.title)} className="rounded-full bg-red-600/10 px-3 py-1 text-red-700">Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {(data ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/55">No events</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
