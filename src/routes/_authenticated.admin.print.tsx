import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPrintConfigAdmin, updatePrintConfig, type PrintConfigFull } from "@/lib/print.functions";

export const Route = createFileRoute("/_authenticated/admin/print")({
  component: AdminPrint,
});

function AdminPrint() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-print-config"],
    queryFn: () => getPrintConfigAdmin(),
  });
  const [cfg, setCfg] = useState<PrintConfigFull | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data) setCfg(data); }, [data]);

  if (isLoading || !cfg) return <div className="text-ink/60">Loading…</div>;

  async function save() {
    if (!cfg) return;
    setBusy(true);
    try {
      await updatePrintConfig({ data: { config: cfg } });
      toast.success("Print settings saved");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="font-serif text-2xl italic">Printer integration</h2>
        <p className="text-sm text-ink/60">Point the booth at any HTTP endpoint that can accept print jobs. Your bridge receives a JSON payload with the photo data URL, event metadata, and copy count.</p>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-ink/15 bg-card px-3 py-2">
        <span>Enable printing</span>
        <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} className="h-5 w-5" />
      </label>

      <div>
        <label className="text-[10px] uppercase tracking-[0.3em] text-ink/55">Printer endpoint URL</label>
        <input type="url" value={cfg.url} onChange={(e) => setCfg({ ...cfg, url: e.target.value })}
          placeholder="https://print-bridge.example.com/jobs"
          className="mt-1 w-full rounded-xl border border-ink/15 bg-card px-3 py-2" />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-[0.3em] text-ink/55">Shared secret (sent as X-Print-Secret)</label>
        <input type="text" value={cfg.secret} onChange={(e) => setCfg({ ...cfg, secret: e.target.value })}
          placeholder="Optional"
          className="mt-1 w-full rounded-xl border border-ink/15 bg-card px-3 py-2" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-ink/55">Default copies</label>
          <input type="number" min={1} max={10} value={cfg.default_copies}
            onChange={(e) => setCfg({ ...cfg, default_copies: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
            className="mt-1 w-full rounded-xl border border-ink/15 bg-card px-3 py-2" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-[0.3em] text-ink/55">Max copies</label>
          <input type="number" min={1} max={10} value={cfg.max_copies}
            onChange={(e) => setCfg({ ...cfg, max_copies: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })}
            className="mt-1 w-full rounded-xl border border-ink/15 bg-card px-3 py-2" />
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-ink/15 bg-card px-3 py-2">
        <span>Allow guests to change copies</span>
        <input type="checkbox" checked={cfg.allow_override} onChange={(e) => setCfg({ ...cfg, allow_override: e.target.checked })} className="h-5 w-5" />
      </label>

      <button disabled={busy} onClick={save}
        className="rounded-xl bg-ink px-5 py-2 text-cream disabled:opacity-50">
        {busy ? "Saving…" : "Save"}
      </button>

      <details className="mt-6 rounded-xl border border-ink/10 bg-card p-3 text-sm">
        <summary className="cursor-pointer text-ink/70">Payload sent to your endpoint</summary>
        <pre className="mt-2 overflow-auto text-xs text-ink/70">{`POST <url>
Content-Type: application/json
X-Print-Secret: <secret if set>

{
  "photoDataUrl": "data:image/jpeg;base64,...",
  "eventId": "uuid",
  "eventTitle": "Aisha & Daniel",
  "guestName": "Aisha"  | null,
  "copies": 2
}`}</pre>
      </details>
    </div>
  );
}
