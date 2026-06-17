import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FILTERS, getFilterCss, type FilterId } from "@/lib/filters";
import { loadGuest } from "@/lib/guest-session";
import { uploadPhoto } from "@/lib/kenangan.functions";
import { listTemplatesForEvent, type TemplateRow } from "@/lib/templates.functions";
import { getPrintConfigPublic } from "@/lib/print.functions";
import { PrintOptionsSheet } from "@/components/print-options-sheet";
import { RotateCcw, Circle, Printer } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="text-center text-[10px] uppercase tracking-[0.3em] text-ink/55">Capture</div>
      <h1 className="text-center font-serif text-3xl italic">Strike a pose</h1>

      <div className="relative mt-4 aspect-[3/4] overflow-hidden rounded-3xl border border-ink/10 bg-ink shadow-[0_20px_50px_-25px_rgba(40,25,15,0.5)]">
        {preview ? (
          <img src={preview} className="h-full w-full object-cover" alt="preview" />
        ) : (
          <>
            <video ref={videoRef} playsInline muted
              style={{ filter: getFilterCss(filter), transform: facing === "user" ? "scaleX(-1)" : undefined }}
              className="h-full w-full object-cover" />
            {templateId && templates.find((x) => x.id === templateId)?.asset_url && (
              <img src={templates.find((x) => x.id === templateId)!.asset_url!} alt=""
                className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            )}
            <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-cream/80 text-ink">
              <RotateCcw size={16} />
            </button>
          </>
        )}
      </div>

      {!preview ? (
        <>
          {templates.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-ink/55">{t("booth.chooseTemplate")}</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <TemplateChip active={templateId === null} onClick={() => setTemplateId(null)} label={t("booth.none")} />
                {templates.map((tp) => (
                  <TemplateChip key={tp.id} active={templateId === tp.id} onClick={() => setTemplateId(tp.id)}
                    label={tp.name} thumb={tp.preview_url ?? tp.asset_url} />
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider ${
                  filter === f.id ? "border-ink bg-ink text-cream" : "border-ink/15 bg-card text-ink/70"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid place-items-center">
            <button onClick={snap}
              className="grid h-20 w-20 place-items-center rounded-full border-4 border-ink bg-cream shadow-[0_15px_30px_-15px_rgba(40,25,15,0.5)] active:scale-95">
              <Circle size={56} fill="currentColor" className="text-ink" />
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 space-y-2">
          {templates.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <TemplateChip active={templateId === null} onClick={() => changeTemplate(null)} label={t("booth.none")} />
              {templates.map((tp) => (
                <TemplateChip key={tp.id} active={templateId === tp.id} onClick={() => changeTemplate(tp.id)}
                  label={tp.name} thumb={tp.preview_url ?? tp.asset_url} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={retake} className="rounded-xl border border-ink/15 bg-card py-3">{t("booth.retake")}</button>
            <button disabled={busy} onClick={send} className="rounded-xl bg-ink py-3 text-cream disabled:opacity-50">
              {busy ? "Sending…" : "Send to album"}
            </button>
          </div>
          {printCfg?.enabled && (
            <button onClick={() => setPrintOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink/90 py-3 text-cream">
              <Printer size={16} /> {t("booth.sendToPrinter")}
            </button>
          )}
          <button onClick={printPhoto} className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink/15 bg-card py-3 text-ink">
            <Printer size={16} /> {t("booth.printLocal")}
          </button>
        </div>
      )}
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
      className={`flex shrink-0 items-center gap-2 rounded-full border px-2 py-1 text-xs ${active ? "border-ink bg-ink text-cream" : "border-ink/15 bg-card text-ink/70"}`}>
      <span className={`grid h-7 w-7 place-items-center overflow-hidden rounded-full ${active ? "bg-cream/20" : "bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:10px_10px]"}`}>
        {thumb ? <img src={thumb} alt="" className="h-full w-full object-contain" /> : <span>{active ? "✓" : "—"}</span>}
      </span>
      <span className="pr-2 italic">{label}</span>
    </button>
  );
}

// Silence unused warnings for templates row type in some bundlers
export type _TemplateRowKeep = TemplateRow;
