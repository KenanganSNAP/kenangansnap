import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMyHost, updateMyContactInfo } from "@/lib/kenangan.functions";
import { Clock, CheckCircle2, Ban } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/pending")({
  component: PendingPage,
});

function PendingPage() {
  const qc = useQueryClient();
  const { data: host, isLoading } = useQuery({ queryKey: ["my-host"], queryFn: () => getMyHost() });
  const [form, setForm] = useState({ full_name: "", phone: "", company: "", event_interest: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (host) setForm({
      full_name: host.full_name ?? "",
      phone: host.phone ?? "",
      company: host.company ?? "",
      event_interest: host.event_interest ?? "",
    });
  }, [host]);

  if (isLoading) return <p className="px-6 py-10 text-ink/60 dark:text-foreground/60">Loading…</p>;
  if (host?.status === "approved") return <Navigate to="/dashboard" />;

  const suspended = host?.status === "suspended";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyContactInfo({ data: {
        full_name: form.full_name || null,
        phone: form.phone || null,
        company: form.company || null,
        event_interest: form.event_interest || null,
      }});
      toast.success("Contact information saved");
      qc.invalidateQueries({ queryKey: ["my-host"] });
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="rounded-3xl border border-ink/10 bg-card/80 p-8 shadow-[0_30px_60px_-30px_rgba(40,25,15,0.4)] backdrop-blur dark:border-foreground/10">
        <div className="flex items-center gap-3">
          {suspended ? (
            <Ban className="text-red-600" size={20} />
          ) : (
            <Clock className="text-amber-600" size={20} />
          )}
          <div className="text-[10px] uppercase tracking-[0.3em] text-ink/60 dark:text-foreground/60">
            {suspended ? "Account suspended" : "Awaiting approval"}
          </div>
        </div>
        <h1 className="mt-2 font-serif text-3xl italic">
          {suspended ? "Your account is on hold" : "Thanks for joining KenanganSnap"}
        </h1>
        <p className="mt-2 text-sm text-ink/65 dark:text-foreground/65">
          {suspended
            ? "Please reach out to our team to restore access."
            : "An administrator will review your account shortly. In the meantime, share a little about the event you'd like to host so we can get back to you faster."}
        </p>

        <div className="mt-4 rounded-2xl bg-cream-deep/60 px-4 py-3 text-sm text-ink/75 dark:bg-foreground/5 dark:text-foreground/75">
          Signed in as <span className="font-medium">{host?.email}</span>
        </div>

        {!suspended && (
          <form onSubmit={save} className="mt-6 space-y-4">
            <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} maxLength={100} />
            <Field label="Phone / WhatsApp" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} maxLength={30} />
            <Field label="Company / organization" value={form.company} onChange={(v) => setForm({ ...form, company: v })} maxLength={100} />
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">Event interest</span>
              <textarea
                rows={4} maxLength={1000} value={form.event_interest}
                onChange={(e) => setForm({ ...form, event_interest: e.target.value })}
                placeholder="Event type, expected date, number of guests, anything else we should know."
                className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-foreground/5"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              {host?.contact_updated_at && (
                <span className="inline-flex items-center gap-1 text-xs text-ink/55 dark:text-foreground/55">
                  <CheckCircle2 size={12} /> Last updated {new Date(host.contact_updated_at).toLocaleString()}
                </span>
              )}
              <button disabled={saving} className="ml-auto rounded-full bg-ink px-5 py-2.5 text-sm text-cream disabled:opacity-60">
                {saving ? "Saving…" : "Save details"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (v: string) => void; maxLength: number }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">{label}</span>
      <input
        type="text" maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-foreground/5"
      />
    </label>
  );
}
