import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllGuests, adminDeleteGuest } from "@/lib/kenangan.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/guests")({
  component: AdminGuests,
});

function AdminGuests() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-guests"], queryFn: () => listAllGuests() });

  async function remove(id: string, name: string) {
    if (!confirm(`Delete guest "${name}"?`)) return;
    try {
      await adminDeleteGuest({ data: { guestId: id } });
      toast.success("Guest deleted");
      qc.invalidateQueries({ queryKey: ["admin-guests"] });
    } catch (err) { toast.error((err as Error).message); }
  }

  if (isLoading) return <p className="text-ink/60">Loading…</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-cream-deep/60 text-left text-[10px] uppercase tracking-wider text-ink/60">
          <tr><th className="px-4 py-3">Guest</th><th>Event</th><th>Joined</th><th className="px-4 text-right">Actions</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((g) => (
            <tr key={g.id} className="border-t border-ink/5">
              <td className="px-4 py-3 font-serif italic">{g.name}</td>
              <td className="text-ink/70">{(g as { events?: { title?: string } }).events?.title ?? "—"}</td>
              <td className="text-ink/60">{new Date(g.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => remove(g.id, g.name)} className="rounded-full bg-red-600/10 px-3 py-1 text-red-700">Delete</button>
              </td>
            </tr>
          ))}
          {(data ?? []).length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-ink/55">No guests yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
