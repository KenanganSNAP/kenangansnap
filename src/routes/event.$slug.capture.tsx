import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FILTERS, getFilterCss, type FilterId } from "@/lib/filters";
import { loadGuest } from "@/lib/guest-session";
import { uploadPhoto } from "@/lib/kenangan.functions";
import { listTemplatesForEvent, type TemplateRow } from "@/lib/templates.functions";
import { getPrintConfigPublic } from "@/lib/print.functions";
import { PrintOptionsSheet } from "@/components/print-options-sheet";
import { RotateCcw, Printer, ArrowLeft, Images, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/event/$slug/capture")({
  component: Capture,
});

function Capture() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [filter, setFilter] = useState<FilterId>("warm");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["event-templates-public", slug],
    queryFn: () => listTemplatesForEvent({ data: { slug } }),
  });

  const { data: printCfg } = useQuery({
    queryKey: ["print-config-public"],
    queryFn: () => getPrintConfigPublic(),
  });

  function printPhoto() {
    if (!preview) return;
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) { toast.error("Pop-up blocked. Allow pop-ups to print."); return; }
    w.document.write(`<!doctype html><html><head><title>Print</title><style>
      @page { margin: 12mm; }
      html,body{margin:0;padding:0;background:#fff;}
      .wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;}
      img{max-width:100%;max-height:100vh;object-fit:contain;}
      @media print { .wrap{min-height:auto;} }
    </style></head><body><div class="wrap"><img src="${preview}" onload="setTimeout(()=>{window.focus();window.print();},100)"/></div></body></html>`);
    w.document.close();
  }

  useEffect(() => {
    const guest = loadGuest(slug);
    if (!guest) { nav({ to: "/event/$slug", params: { slug } }); return; }
  }, [slug, nav]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 } }, audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        toast.error("Camera blocked. Allow camera access and refresh.");
      }
    }
    start();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [facing]);

  // Re-attach the live stream whenever we leave the preview state (or return to the tab)
  useEffect(() => {
    if (preview) return;
    function reattach() {
      const v = videoRef.current;
      const stream = streamRef.current;
      if (!v || !stream) return;
      if (v.srcObject !== stream) v.srcObject = stream;
      if (v.paused) v.play().catch(() => {});
    }
    reattach();
    document.addEventListener("visibilitychange", reattach);
    return () => document.removeEventListener("visibilitychange", reattach);
  }, [preview]);

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function composite(baseDataUrl: string, tplId: string | null): Promise<string> {
    if (!tplId) return baseDataUrl;
    const tpl = templates.find((x) => x.id === tplId);
    if (!tpl?.asset_url) return baseDataUrl;
    try {
      const [base, overlay] = await Promise.all([loadImage(baseDataUrl), loadImage(tpl.asset_url)]);
      const canvas = document.createElement("canvas");
      canvas.width = base.width; canvas.height = base.height;
      const ctx = canvas.getContext("2d"); if (!ctx) return baseDataUrl;
      ctx.drawImage(base, 0, 0);
      ctx.drawImage(overlay, 0, 0, base.width, base.height);
      return canvas.toDataURL("image/jpeg", 0.92);
    } catch {
      toast.error("Could not apply the template");
      return baseDataUrl;
    }
  }

  async function snap() {
    const v = videoRef.current; if (!v) return;
    const w = v.videoWidth, h = v.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.filter = getFilterCss(filter);
    if (facing === "user") { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0, w, h);
    const original = canvas.toDataURL("image/jpeg", 0.9);
    setOriginalPreview(original);
    const composed = await composite(original, templateId);
    setPreview(composed);
  }

  async function changeTemplate(id: string | null) {
    setTemplateId(id);
    if (originalPreview) {
      const composed = await composite(originalPreview, id);
      setPreview(composed);
    }
  }

  async function send() {
    if (!preview) return;
    const guest = loadGuest(slug);
    if (!guest) return;
    setBusy(true);
    try {
      await uploadPhoto({ data: {
        slug, guestId: guest.guestId, guestName: guest.name, filter, dataUrl: preview,
        originalDataUrl: templateId && originalPreview !== preview ? originalPreview : null,
        templateId,
      } });
      toast.success("Saved to the album");
      setPreview(null); setOriginalPreview(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  function retake() {
    setPreview(null);
    setOriginalPreview(null);
  }

  const activeTpl = templates.find((x) => x.id === templateId);

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-ink">
      {/* Camera / preview surface */}
      <div className="absolute inset-0">
        <video ref={videoRef} playsInline muted autoPlay
          style={{ filter: getFilterCss(filter), transform: facing === "user" ? "scaleX(-1)" : undefined }}
          className="h-full w-full object-cover" />
        {!preview && activeTpl?.asset_url && (
          <img src={activeTpl.asset_url} alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        )}
        {preview && (
          <img src={preview} className="absolute inset-0 h-full w-full object-cover" alt="preview" />
        )}
      </div>

      {/* Top bar */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-4"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
      >
        <Link
          to="/event/$slug"
          params={{ slug }}
          className="grid h-10 w-10 place-items-center rounded-full bg-ink/45 text-cream backdrop-blur"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="rounded-full bg-ink/45 px-4 py-1.5 font-serif text-sm italic text-cream backdrop-blur">
          {loadGuest(slug)?.name ?? "Capture"}
        </span>
        {preview ? (
          <button onClick={retake} aria-label={t("booth.retake")}
            className="grid h-10 w-10 place-items-center rounded-full bg-ink/45 text-cream backdrop-blur">
            <X size={18} />
          </button>
        ) : (
          <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            aria-label="Flip camera"
            className="grid h-10 w-10 place-items-center rounded-full bg-ink/45 text-cream backdrop-blur">
            <RotateCcw size={18} />
          </button>
        )}
      </div>

      {/* Bottom control stack */}
      <div
        className="absolute inset-x-0 bottom-0 space-y-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        {templates.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-1">
            <TemplateChip active={templateId === null} onClick={() => (preview ? changeTemplate(null) : setTemplateId(null))} label={t("booth.none")} />
            {templates.map((tp) => (
              <TemplateChip key={tp.id} active={templateId === tp.id}
                onClick={() => (preview ? changeTemplate(tp.id) : setTemplateId(tp.id))}
                label={tp.name} thumb={tp.preview_url ?? tp.asset_url} />
            ))}
          </div>
        )}

        {!preview && (
          <div className="flex gap-3 overflow-x-auto px-4 pb-1">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)} className="shrink-0 text-center">
                <span
                  className={`grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border-2 bg-ink/50 text-[10px] uppercase tracking-wide text-cream/90 backdrop-blur ${
                    filter === f.id ? "border-gold" : "border-cream/25"
                  }`}
                  style={{ filter: f.id === "none" ? undefined : getFilterCss(f.id) }}
                >
                  {f.label.slice(0, 2)}
                </span>
                <span className={`mt-1 block text-[9px] uppercase tracking-[0.15em] ${filter === f.id ? "text-gold" : "text-cream/75"}`}>
                  {f.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {!preview ? (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-6">
              <div />
              <button onClick={snap} aria-label="Take photo"
                className="grid h-20 w-20 place-items-center rounded-full border-4 border-cream/90 bg-cream/25 backdrop-blur active:scale-95">
                <span className="h-14 w-14 rounded-full bg-cream" />
              </button>
              <div className="flex justify-end">
                <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
                  aria-label="Flip camera"
                  className="grid h-11 w-11 place-items-center rounded-full bg-ink/45 text-cream backdrop-blur">
                  <RotateCcw size={18} />
                </button>
              </div>
            </div>
            <div className="flex justify-center px-6">
              <Link to="/event/$slug/album" params={{ slug }}
                className="flex items-center gap-2 rounded-full bg-ink/50 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-cream backdrop-blur">
                <Images size={15} /> {t("bottomNav.album")}
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-2 px-4">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={retake} className="rounded-xl bg-ink/50 py-3 text-cream backdrop-blur">{t("booth.retake")}</button>
              <button disabled={busy} onClick={send} className="rounded-xl bg-cream py-3 text-ink disabled:opacity-50">
                {busy ? "Sending…" : "Send to album"}
              </button>
            </div>
            {printCfg?.enabled && (
              <button onClick={() => setPrintOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink/60 py-3 text-cream backdrop-blur">
                <Printer size={16} /> {t("booth.sendToPrinter")}
              </button>
            )}
            <button onClick={printPhoto}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cream/30 bg-ink/40 py-3 text-cream backdrop-blur">
              <Printer size={16} /> {t("booth.printLocal")}
            </button>
          </div>
        )}
      </div>

      {printCfg?.enabled && (
        <PrintOptionsSheet
          open={printOpen}
          onClose={() => setPrintOpen(false)}
          config={printCfg}
          slug={slug}
          guestName={loadGuest(slug)?.name ?? ""}
          templatedDataUrl={preview}
          originalDataUrl={originalPreview}
        />
      )}
    </div>
  );
}

function TemplateChip({ active, onClick, label, thumb }: { active: boolean; onClick: () => void; label: string; thumb?: string | null }) {
  return (
    <button onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-2 py-1 text-xs backdrop-blur ${active ? "border-gold bg-cream text-ink" : "border-cream/25 bg-ink/45 text-cream/85"}`}>
      <span className={`grid h-7 w-7 place-items-center overflow-hidden rounded-full ${active ? "bg-ink/10" : "bg-cream/15"}`}>
        {thumb ? <img src={thumb} alt="" className="h-full w-full object-contain" /> : <span>{active ? "✓" : "—"}</span>}
      </span>
      <span className="pr-2 italic">{label}</span>
    </button>
  );
}

// Silence unused warnings for templates row type in some bundlers
export type _TemplateRowKeep = TemplateRow;
