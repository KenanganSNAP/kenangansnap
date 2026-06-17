import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  listHosts, setHostStatus, deleteHost, adminUpdateHostContact,
  listAdmins, grantAdminByEmail, revokeAdmin,
  getMyAdminPrefs, updateMyAdminPrefs,
} from "@/lib/kenangan.functions";
import { toast } from "sonner";
import { Bell, BellOff, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHosts,
});

type HostRow = Awaited<ReturnType<typeof listHosts>>[number];

function AdminHosts() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-hosts"], queryFn: () => listHosts() });
  const { data: admins } = useQuery({ queryKey: ["admin-admins"], queryFn: () => listAdmins() });
  const { data: prefs } = useQuery({ queryKey: ["admin-prefs"], queryFn: () => getMyAdminPrefs() });
  const [adminEmail, setAdminEmail] = useState("");
  const [granting, setGranting] = useState(false);
  const [editing, setEditing] = useState<HostRow | null>(null);

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
  async function grant(e: React.FormEvent) {
    e.preventDefault();
    if (!adminEmail.trim()) return;
    setGranting(true);
    try {
      await grantAdminByEmail({ data: { email: adminEmail.trim() } });
      toast.success("Admin access granted");
      setAdminEmail("");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    } catch (err) { toast.error((err as Error).message); }
    finally { setGranting(false); }
  }
  async function revoke(userId: string, email: string) {
    if (!confirm(`Revoke admin access from ${email}?`)) return;
    try {
      await revokeAdmin({ data: { userId } });
      toast.success("Admin access revoked");
      qc.invalidateQueries({ queryKey: ["admin-admins"] });
    } catch (err) { toast.error((err as Error).message); }
  }
  async function toggleNotify(next: boolean) {
    await updateMyAdminPrefs({ data: { notify_new_signups: next } });
    qc.invalidateQueries({ queryKey: ["admin-prefs"] });
    toast.success(next ? "Notifications on" : "Notifications off");
  }

  if (isLoading) return <p className="text-ink/60">Loading…</p>;

  const pendingCount = (data ?? []).filter((h) => h.status === "pending").length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-ink/10 bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl italic">Notification preferences</h2>
            <p className="mt-1 text-sm text-ink/65">Email me when a new host signs up and needs approval.</p>
          </div>
          <button
            onClick={() => toggleNotify(!prefs?.notify_new_signups)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm ${
              prefs?.notify_new_signups
                ? "bg-emerald-600/10 text-emerald-700"
                : "bg-ink/5 text-ink/60"
            }`}
          >
            {prefs?.notify_new_signups ? <><Bell size={14} /> On</> : <><BellOff size={14} /> Off</>}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-card p-5">
        <h2 className="font-serif text-xl italic">Administrators</h2>
        <p className="mt-1 text-sm text-ink/65">Grant studio control to any signed-up user by email.</p>
        <form onSubmit={grant} className="mt-4 flex flex-wrap gap-2">
          <input
            type="email" required value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 min-w-[220px] rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold"
          />
          <button disabled={granting} type="submit" className="rounded-xl bg-ink px-4 py-2.5 text-sm text-cream disabled:opacity-60">
            {granting ? "Granting…" : "Make admin"}
          </button>
        </form>
        <ul className="mt-4 divide-y divide-ink/5">
          {(admins ?? []).map((a) => (
            <li key={a.user_id} className="flex items-center justify-between py-2 text-sm">
              <span>{a.email || a.user_id}</span>
              <button
                onClick={() => revoke(a.user_id, a.email || a.user_id)}
                className="rounded-full bg-red-600/10 px-3 py-1 text-red-700"
              >
                Revoke
              </button>
            </li>
          ))}
          {(admins ?? []).length === 0 && <li className="py-3 text-sm text-ink/55">No admins yet.</li>}
        </ul>
      </section>

      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card">
        <div className="flex items-center justify-between border-b border-ink/5 px-4 py-3">
          <h2 className="font-serif text-lg italic">Hosts</h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-800">
              {pendingCount} awaiting approval
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-cream-deep/60 text-left text-[10px] uppercase tracking-wider text-ink/60">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
              <th className="px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((h) => (
              <tr key={h.user_id} className={`border-t border-ink/5 ${h.status === "pending" ? "bg-amber-500/5" : ""}`}>
                <td className="px-4 py-3">{h.email}</td>
                <td className="text-ink/75">{h.full_name || <span className="text-ink/40">—</span>}</td>
                <td className="text-ink/75">{h.phone || <span className="text-ink/40">—</span>}</td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    h.status === "approved" ? "bg-emerald-500/15 text-emerald-700"
                      : h.status === "suspended" ? "bg-red-500/15 text-red-700"
                      : "bg-amber-500/15 text-amber-800"}`}>{h.status}</span>
                </td>
                <td className="text-ink/60">{new Date(h.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-1">
                    <button onClick={() => setEditing(h)} className="rounded-full bg-ink/5 px-3 py-1 text-ink/75">Contact</button>
                    {h.status !== "approved" && <button onClick={() => change(h.user_id, "approved")} className="rounded-full bg-emerald-600/10 px-3 py-1 text-emerald-700">Approve</button>}
                    {h.status !== "suspended" && <button onClick={() => change(h.user_id, "suspended")} className="rounded-full bg-amber-600/10 px-3 py-1 text-amber-800">Suspend</button>}
                    <button onClick={() => remove(h.user_id)} className="rounded-full bg-red-600/10 px-3 py-1 text-red-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-ink/55">No hosts yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && <ContactDialog host={editing} onClose={() => setEditing(null)} onSaved={() => {
        qc.invalidateQueries({ queryKey: ["admin-hosts"] });
        setEditing(null);
      }} />}
    </div>
  );
}

function ContactDialog({ host, onClose, onSaved }: { host: HostRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: host.full_name ?? "",
    phone: host.phone ?? "",
    company: host.company ?? "",
    event_interest: host.event_interest ?? "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await adminUpdateHostContact({ data: {
        userId: host.user_id,
        full_name: form.full_name || null,
        phone: form.phone || null,
        company: form.company || null,
        event_interest: form.event_interest || null,
      }});
      toast.success("Contact info updated");
      onSaved();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()} onSubmit={save}
        className="w-full max-w-lg rounded-3xl border border-ink/10 bg-card p-6 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-ink/60">Host contact</div>
            <h3 className="mt-1 font-serif text-2xl italic">{host.email}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-ink/60 hover:bg-ink/5"><X size={18} /></button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} maxLength={100} />
          <Field label="Phone / WhatsApp" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} maxLength={30} />
          <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} maxLength={100} />
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink/60">Event interest</span>
            <textarea rows={4} maxLength={1000} value={form.event_interest}
              onChange={(e) => setForm({ ...form, event_interest: e.target.value })}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full bg-ink/5 px-4 py-2 text-sm text-ink/70">Cancel</button>
          <button disabled={saving} className="rounded-full bg-ink px-5 py-2 text-sm text-cream disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (v: string) => void; maxLength: number }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60">{label}</span>
      <input
        type="text" maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold"
      />
    </label>
  );
}
