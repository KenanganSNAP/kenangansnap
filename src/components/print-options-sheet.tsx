import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Printer, X } from "lucide-react";
import { submitPrintJob, type PrintConfigPublic } from "@/lib/print.functions";

export function PrintOptionsSheet({
  open,
  onClose,
  config,
  slug,
  guestName,
  templatedDataUrl,
  originalDataUrl,
}: {
  open: boolean;
  onClose: () => void;
  config: PrintConfigPublic;
  slug: string;
  guestName: string;
  templatedDataUrl: string | null;
  originalDataUrl: string | null;
}) {
  const { t } = useTranslation();
  const [copies, setCopies] = useState(config.default_copies);
  const [includeName, setIncludeName] = useState(guestName.length > 0);
  const [useTemplate, setUseTemplate] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const hasOriginal = !!originalDataUrl && originalDataUrl !== templatedDataUrl;
  const chosen = useTemplate || !hasOriginal ? templatedDataUrl : originalDataUrl;

  const copyOptions = config.allow_override
    ? Array.from({ length: Math.min(config.max_copies, 4) }, (_, i) => i + 1)
    : [config.default_copies];

  async function send() {
    if (!chosen) return;
    setBusy(true);
    try {
      const res = await submitPrintJob({
        data: { slug, dataUrl: chosen, guestName, includeName, copies },
      });
      if (res.ok) {
        toast.success(t("booth.printed"));
        onClose();
      } else {
        toast.error(t("booth.printFailed"));
      }
    } catch (e) {
      toast.error((e as Error).message || t("booth.printFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 text-ink shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-ink/55">Booth</div>
            <h2 className="font-serif text-2xl italic">{t("booth.printOptions")}</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-ink/15">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-ink/55">{t("booth.copies")}</div>
            <div className="flex gap-2">
              {copyOptions.map((n) => (
                <button key={n} onClick={() => setCopies(n)}
                  className={`flex-1 rounded-xl border py-2 ${copies === n ? "border-ink bg-ink text-cream" : "border-ink/15 bg-card text-ink/70"}`}>
                  {n}
                </button>
              ))}
            </div>
            {!config.allow_override && (
              <div className="mt-1 text-xs text-ink/55">Fixed by admin.</div>
            )}
          </div>

          <label className="flex items-center justify-between rounded-xl border border-ink/15 px-3 py-2">
            <span>{t("booth.includeName")}</span>
            <input type="checkbox" checked={includeName} onChange={(e) => setIncludeName(e.target.checked)}
              disabled={!guestName} className="h-5 w-5" />
          </label>

          {hasOriginal && (
            <label className="flex items-center justify-between rounded-xl border border-ink/15 px-3 py-2">
              <span>Use selected template</span>
              <input type="checkbox" checked={useTemplate} onChange={(e) => setUseTemplate(e.target.checked)} className="h-5 w-5" />
            </label>
          )}

          <button disabled={busy} onClick={send}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-cream disabled:opacity-50">
            <Printer size={16} />
            {busy ? "Sending…" : t("booth.sendToPrinter")}
          </button>
        </div>
      </div>
    </div>
  );
}
