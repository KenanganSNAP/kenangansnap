import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { listMemories, uploadVoice } from "@/lib/kenangan.functions";
import { loadGuest } from "@/lib/guest-session";
import { downloadFile, safeFilename } from "@/lib/download";
import { Mic, Square, Download } from "lucide-react";

export const Route = createFileRoute("/event/$slug/voice")({
  component: Voice,
});

const MAX_S = 60;

function Voice() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({ queryKey: ["memories", slug], queryFn: () => listMemories({ data: { slug } }) });

  useEffect(() => {
    if (!loadGuest(slug)) nav({ to: "/event/$slug", params: { slug } });
  }, [slug, nav]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        await sendBlob(blob);
        setSecs(0);
      };
      rec.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setSecs((s) => {
          if (s + 1 >= MAX_S) { stop(); return MAX_S; }
          return s + 1;
        });
      }, 1000);
    } catch { toast.error("Microphone blocked"); }
  }

  function stop() {
    recRef.current?.state === "recording" && recRef.current.stop();
    setRecording(false);
  }

  async function sendBlob(blob: Blob) {
    const guest = loadGuest(slug); if (!guest) return;
    setBusy(true);
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = () => rej(new Error("read"));
        r.readAsDataURL(blob);
      });
      await uploadVoice({ data: { slug, guestId: guest.guestId, guestName: guest.name, dataUrl } });
      toast.success("Voice note saved");
      qc.invalidateQueries({ queryKey: ["memories", slug] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="text-center text-[10px] uppercase tracking-[0.3em] text-ink/55">Voice</div>
      <h1 className="text-center font-serif text-3xl italic">Say it out loud</h1>
      <p className="text-center text-sm text-ink/60">Up to {MAX_S} seconds.</p>

      <div className="mt-6 grid place-items-center rounded-3xl border border-ink/10 bg-card p-8">
        <button
          onClick={recording ? stop : start}
          disabled={busy}
          className={`grid h-28 w-28 place-items-center rounded-full ${recording ? "bg-red-600 text-cream" : "bg-ink text-cream"} shadow-[0_15px_30px_-15px_rgba(40,25,15,0.5)] active:scale-95 disabled:opacity-50`}>
          {recording ? <Square size={36} fill="currentColor" /> : <Mic size={36} />}
        </button>
        <div className="mt-4 font-serif text-3xl italic tabular-nums">
          {String(Math.floor(secs / 60)).padStart(1, "0")}:{String(secs % 60).padStart(2, "0")}
        </div>
        <div className="mt-1 text-xs uppercase tracking-wider text-ink/55">
          {busy ? "Uploading…" : recording ? "Tap to stop" : "Tap to record"}
        </div>
      </div>

      {data?.revealed && data.voices.length > 0 && (
        <section className="mt-8">
          <h2 className="text-center font-serif text-2xl italic">From others</h2>
          <ul className="mt-4 space-y-2">
            {data.voices.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-card p-3">
                <span className="font-serif italic">{v.guest_name}</span>
                <audio controls src={v.signed_url} className="h-9 grow" />
                <button onClick={() => downloadFile(v.signed_url, `${safeFilename(slug)}-${safeFilename(v.guest_name)}.webm`)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-cream-deep/70">
                  <Download size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
