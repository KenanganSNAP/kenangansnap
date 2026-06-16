import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listAllEvents } from "@/lib/kenangan.functions";

export const Route = createFileRoute("/_authenticated/admin/events")({
  component: AdminEvents,
});

function AdminEvents() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-events"], queryFn: () => listAllEvents() });
  if (isLoading) return <p className="text-ink/60">Loading…</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-cream-deep/60 text-left text-[10px] uppercase tracking-wider text-ink/60">
          <tr><th className="px-4 py-3">Event</th><th>Host</th><th>Type</th><th>Date</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {(data ?? []).map((e) => (
            <tr key={e.id} className="border-t border-ink/5">
              <td className="px-4 py-3 font-serif italic">{e.title}</td>
              <td className="text-ink/70">{e.host_email ?? "—"}</td>
              <td className="text-ink/70">{e.event_type}</td>
              <td className="text-ink/70">{e.date ? new Date(e.date).toLocaleDateString() : "—"}</td>
              <td>
                <span className={e.is_active ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700" : "rounded-full bg-ink/10 px-2 py-0.5"}>
                  {e.is_active ? "Live" : "Paused"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <Link to="/event/$slug" params={{ slug: e.slug }} className="text-ink underline">View</Link>
              </td>
            </tr>
          ))}
          {(data ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/55">No events</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
