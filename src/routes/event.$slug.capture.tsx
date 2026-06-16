import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FILTERS, getFilterCss, type FilterId } from "@/lib/filters";
import { loadGuest } from "@/lib/guest-session";
import { uploadPhoto } from "@/lib/kenangan.functions";
import { RotateCcw, Circle } from "lucide-react";

export const Route = createFileRoute("/event/$slug/capture")({
  component: Capture,
});

function Capture() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [filter, setFilter] = useState<FilterId>("warm");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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
      } catch (e) {
        toast.error("Camera blocked. Allow camera access and refresh.");
      }
    }
    start();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [facing]);

  function snap() {
    const v = videoRef.current; if (!v) return;
    const w = v.videoWidth, h = v.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.filter = getFilterCss(filter);
    if (facing === "user") { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0, w, h);
    setPreview(canvas.toDataURL("image/jpeg", 0.9));
  }

  async function send() {
    if (!preview) return;
    const guest = loadGuest(slug);
    if (!guest) return;
    setBusy(true);
    try {
      await uploadPhoto({ data: { slug, guestId: guest.guestId, guestName: guest.name, filter, dataUrl: preview } });
      toast.success("Saved to the album");
      setPreview(null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="text-center text-[10px] uppercase tracking-[0.3em] text-ink/55">Capture</div>
      <h1 className="text-center font-serif text-3xl italic">Strike a pose</h1>

      <div className="relative mt-4 aspect-[3/4] overflow-hidden rounded-3xl border border-ink/10 bg-ink shadow-[0_20px_50px_-25px_rgba(40,25,15,0.5)]">
        {preview ? (
          <img src={preview} className="h-full w-full object-cover" alt="preview" />
        ) : (
          <video ref={videoRef} playsInline muted
            style={{ filter: getFilterCss(filter), transform: facing === "user" ? "scaleX(-1)" : undefined }}
            className="h-full w-full object-cover" />
        )}
        {!preview && (
          <button onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-cream/80 text-ink">
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {!preview ? (
        <>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
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
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setPreview(null)} className="rounded-xl border border-ink/15 bg-card py-3">Retake</button>
          <button disabled={busy} onClick={send} className="rounded-xl bg-ink py-3 text-cream disabled:opacity-50">
            {busy ? "Sending…" : "Send to album"}
          </button>
        </div>
      )}
    </div>
  );
}
