import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listHosts, setHostStatus, deleteHost } from "@/lib/kenangan.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHosts,
});

function AdminHosts() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-hosts"], queryFn: () => listHosts() });

  async function change(userId: string, status: "approved" | "suspended" | "pending") {
    await setHostStatus({ data: { userId, status } });
    toast.success(`Host ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-hosts"] });
  }
  async function remove(userId: string) {
    if (!confirm("Permanently delete this host?")) return;
    await deleteHost({ data: { userId } });
    toast.success("Host removed");
    qc.invalidateQueries({ queryKey: ["admin-hosts"] });
  }

  if (isLoading) return <p className="text-ink/60">Loading…</p>;

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-cream-deep/60 text-left text-[10px] uppercase tracking-wider text-ink/60">
          <tr><th className="px-4 py-3">Email</th><th>Status</th><th>Joined</th><th className="px-4 text-right">Actions</th></tr>
        </thead>
        <tbody>
          {(data ?? []).map((h) => (
            <tr key={h.user_id} className="border-t border-ink/5">
              <td className="px-4 py-3">{h.email}</td>
              <td>
                <span className={`rounded-full px-2 py-0.5 text-xs ${
                  h.status === "approved" ? "bg-emerald-500/15 text-emerald-700"
                    : h.status === "suspended" ? "bg-red-500/15 text-red-700"
                    : "bg-amber-500/15 text-amber-800"}`}>{h.status}</span>
              </td>
              <td className="text-ink/60">{new Date(h.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex gap-1">
                  {h.status !== "approved" && <button onClick={() => change(h.user_id, "approved")} className="rounded-full bg-emerald-600/10 px-3 py-1 text-emerald-700">Approve</button>}
                  {h.status !== "suspended" && <button onClick={() => change(h.user_id, "suspended")} className="rounded-full bg-amber-600/10 px-3 py-1 text-amber-800">Suspend</button>}
                  <button onClick={() => remove(h.user_id)} className="rounded-full bg-red-600/10 px-3 py-1 text-red-700">Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {(data ?? []).length === 0 && (
            <tr><td colSpan={4} className="px-4 py-10 text-center text-ink/55">No hosts yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
