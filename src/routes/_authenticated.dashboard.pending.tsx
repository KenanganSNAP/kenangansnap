import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getMyHost, updateMyContactInfo } from "@/lib/kenangan.functions";
import { Clock, CheckCircle2, Ban, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/pending")({
  component: PendingPage,
});

function PendingPage() {
  const qc = useQueryClient();
  const { data: host, isLoading } = useQuery({ queryKey: ["my-host"], queryFn: () => getMyHost() });
  const [form, setForm] = useState({ full_name: "", phone: "", company: "", event_interest: "" });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

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
  const submitted = !!host?.contact_submitted;
  const showForm = !submitted || editing;
  const requiredOk = form.full_name.trim() && form.phone.trim() && form.event_interest.trim();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyContactInfo({ data: {
        full_name: form.full_name || null,
        phone: form.phone || null,
        company: form.company || null,
        event_interest: form.event_interest || null,
        submit: !submitted,
      }});
      toast.success(submitted ? "Details updated" : "Submitted for approval");
      setEditing(false);
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
          ) : submitted ? (
            <CheckCircle2 className="text-emerald-600" size={20} />
          ) : (
            <Clock className="text-amber-600" size={20} />
          )}
          <div className="text-[10px] uppercase tracking-[0.3em] text-ink/60 dark:text-foreground/60">
            {suspended ? "Account suspended" : submitted ? "Awaiting admin approval" : "Tell us about your event"}
          </div>
        </div>
        <h1 className="mt-2 font-serif text-3xl italic">
          {suspended
            ? "Your account is on hold"
            : submitted
              ? "Thanks — your request is with our team"
              : "Welcome to KenanganSnap"}
        </h1>
        <p className="mt-2 text-sm text-ink/65 dark:text-foreground/65">
          {suspended
            ? "Please reach out to our team to restore access."
            : submitted
              ? "An administrator will review your details shortly and approve your account. You'll be able to create events as soon as that happens."
              : "Share a little about the event you'd like to host. Once you submit, an administrator will review your details and approve your account."}
        </p>

        <div className="mt-4 rounded-2xl bg-cream-deep/60 px-4 py-3 text-sm text-ink/75 dark:bg-foreground/5 dark:text-foreground/75">
          Signed in as <span className="font-medium">{host?.email}</span>
        </div>

        {!suspended && !showForm && (
          <div className="mt-6 space-y-3">
            <Summary label="Full name" value={host?.full_name} />
            <Summary label="Phone / WhatsApp" value={host?.phone} />
            <Summary label="Company / organization" value={host?.company} />
            <Summary label="Event interest" value={host?.event_interest} multiline />
            <div className="flex items-center justify-between gap-3 pt-2">
              {host?.contact_updated_at && (
                <span className="text-xs text-ink/55 dark:text-foreground/55">
                  Last updated {new Date(host.contact_updated_at).toLocaleString()}
                </span>
              )}
              <button onClick={() => setEditing(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-ink/5 px-4 py-2 text-sm text-ink/75 dark:bg-foreground/10 dark:text-foreground/80">
                <Pencil size={14} /> Edit details
              </button>
            </div>
          </div>
        )}

        {!suspended && showForm && (
          <form onSubmit={save} className="mt-6 space-y-4">
            <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} maxLength={100} required />
            <Field label="Phone / WhatsApp" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} maxLength={30} required />
            <Field label="Company / organization" value={form.company} onChange={(v) => setForm({ ...form, company: v })} maxLength={100} />
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">Event interest <span className="text-red-600">*</span></span>
              <textarea
                rows={4} maxLength={1000} value={form.event_interest} required
                onChange={(e) => setForm({ ...form, event_interest: e.target.value })}
                placeholder="Event type, expected date, number of guests, anything else we should know."
                className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-foreground/5"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              {submitted && (
                <button type="button" onClick={() => { setEditing(false); }} className="text-xs text-ink/55 underline dark:text-foreground/55">
                  Cancel
                </button>
              )}
              <button
                disabled={saving || !requiredOk}
                className="ml-auto rounded-full bg-ink px-5 py-2.5 text-sm text-cream disabled:opacity-60"
              >
                {saving ? "Saving…" : submitted ? "Save changes" : "Submit for approval"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-ink/55 dark:text-foreground/55">{label}</div>
      <div className={`mt-1 text-sm ${multiline ? "whitespace-pre-wrap" : ""} ${value ? "text-ink/85 dark:text-foreground/85" : "text-ink/40 dark:text-foreground/40"}`}>
        {value || "—"}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, maxLength, required }: { label: string; value: string; onChange: (v: string) => void; maxLength: number; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type="text" maxLength={maxLength} value={value} required={required} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-2.5 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-foreground/5"
      />
    </label>
  );
}
