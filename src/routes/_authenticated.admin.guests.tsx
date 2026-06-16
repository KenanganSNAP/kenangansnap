import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listAllGuests } from "@/lib/kenangan.functions";

export const Route = createFileRoute("/_authenticated/admin/guests")({
  component: AdminGuests,
});

function AdminGuests() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-guests"], queryFn: () => listAllGuests() });
  if (isLoading) return <p className="text-ink/60">Loading…</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-cream-deep/60 text-left text-[10px] uppercase tracking-wider text-ink/60">
          <tr><th className="px-4 py-3">Guest</th><th>Event</th><th>Joined</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((g) => (
            <tr key={g.id} className="border-t border-ink/5">
              <td className="px-4 py-3 font-serif italic">{g.name}</td>
              <td className="text-ink/70">{(g as { events?: { title?: string } }).events?.title ?? "—"}</td>
              <td className="text-ink/60">{new Date(g.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {(data ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-ink/55">No guests yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
