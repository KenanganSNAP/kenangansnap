import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  getEventForHost, toggleEventActive, deletePhoto, deleteMemory, updateEventInvitation,
} from "@/lib/kenangan.functions";
import { resizeImageToDataUrl } from "@/lib/image-resize";
import { downloadFile, safeFilename } from "@/lib/download";
import { exportZip } from "@/lib/zip-export";
import { downloadQrPoster } from "@/lib/qr-poster";
import { ArrowLeft, Copy, Download, Trash2, Upload, Power, Package, QrCode } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/event/$id")({
  component: ManageEvent,
});

function ManageEvent() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEventForHost({ data: { id } }),
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [zipping, setZipping] = useState<"all" | "photos" | "voices" | null>(null);

  if (isLoading || !data) return <p className="py-10 text-ink/60">Loading…</p>;

  const { event, guests, photos, notes, voices } = data;
  const guestUrl = typeof window !== "undefined"
    ? `${window.location.origin}/event/${event.slug}`
    : `/event/${event.slug}`;

  async function copy() {
    await navigator.clipboard.writeText(guestUrl);
    toast.success("Guest link copied");
  }

  async function toggle() {
    setBusy(true);
    await toggleEventActive({ data: { id: event.id, isActive: !event.is_active } });
    await refetch();
    setBusy(false);
  }

  async function uploadInvite(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    const dataUrl = await resizeImageToDataUrl(file);
    await updateEventInvitation({ data: { id: event.id, dataUrl } });
    toast.success("Invitation updated");
    qc.invalidateQueries({ queryKey: ["event", id] });
  }

  async function delPhoto(pid: string) {
    if (!confirm("Delete this photo?")) return;
    await deletePhoto({ data: { id: pid } });
    qc.invalidateQueries({ queryKey: ["event", id] });
  }
  async function delMem(mid: string) {
    if (!confirm("Delete?")) return;
    await deleteMemory({ data: { id: mid } });
    qc.invalidateQueries({ queryKey: ["event", id] });
  }

  async function zip(kind: "all" | "photos" | "voices") {
    setZipping(kind);
    try {
      const items: { url: string; filename: string }[] = [];
      if (kind !== "voices") {
        photos.forEach((p) => items.push({ url: p.signed_url, filename: `photos/${safeFilename(p.guest_name)}-${p.id.slice(0,6)}.jpg` }));
      }
      if (kind !== "photos") {
        voices.forEach((v) => items.push({ url: v.signed_url, filename: `voices/${safeFilename(v.guest_name)}-${v.id.slice(0,6)}.webm` }));
      }
      if (!items.length) { toast.info("Nothing to download yet"); return; }
      await exportZip(`${event.slug}-${kind}`, items);
      toast.success("Download ready");
    } catch (e) { toast.error((e as Error).message); }
    finally { setZipping(null); }
  }

  async function poster() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    await downloadQrPoster({
      svgEl: svg as SVGSVGElement,
      title: event.title,
      subtitle: event.date ? new Date(event.date).toLocaleDateString() : undefined,
      url: guestUrl,
      filename: event.slug,
    });
  }

  return (
    <div className="py-4">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-ink/70"><ArrowLeft size={14} /> Back</Link>

      <header className="mt-4 grid gap-6 rounded-3xl border border-ink/10 bg-card p-6 lg:grid-cols-[auto,1fr]">
        <div className="flex flex-col items-center gap-3">
          <div ref={qrRef} className="rounded-2xl bg-cream p-3 shadow-[0_10px_30px_-15px_rgba(40,25,15,0.3)]">
            <QRCodeSVG value={guestUrl} size={180} bgColor="transparent" fgColor="#2a1d14" level="M" />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={copy} className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-xs">
              <Copy size={12} /> Copy link
            </button>
            <button onClick={poster} className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-xs">
              <QrCode size={12} /> Poster
            </button>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-ink/55">
            <span>{event.event_type}</span>
            <span className={event.is_active ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700" : "rounded-full bg-ink/10 px-2 py-0.5"}>
              {event.is_active ? "Live" : "Paused"}
            </span>
          </div>
          <h1 className="mt-2 font-serif text-4xl italic">{event.title}</h1>
          <p className="text-ink/65">
            {event.date ? new Date(event.date).toLocaleDateString() : "TBA"} {event.venue ? `· ${event.venue}` : ""}
          </p>
          <p className="mt-2 break-all text-sm text-ink/55">{guestUrl}</p>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <Tile label="Guests" value={guests.length} />
            <Tile label="Photos" value={photos.length} />
            <Tile label="Notes" value={notes.length} />
            <Tile label="Voice" value={voices.length} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={toggle} disabled={busy}
              className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-sm">
              <Power size={14} /> {event.is_active ? "Pause" : "Resume"}
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-sm">
              <Upload size={14} /> {event.invitation_image_url ? "Replace invitation" : "Upload invitation"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadInvite(f); }} />
            <button onClick={() => zip("all")} disabled={zipping !== null}
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-sm text-cream disabled:opacity-60">
              <Package size={14} /> {zipping === "all" ? "Packing…" : "Download all"}
            </button>
          </div>
        </div>
      </header>

      <Section title="Photos">
        {photos.length === 0 ? <Empty msg="No photos yet" /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <figure key={p.id} className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-card">
                <img src={p.signed_url} alt={p.guest_name} className="aspect-square w-full object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/80 to-transparent p-2 text-xs text-cream">
                  <span className="truncate italic">{p.guest_name}</span>
                  <div className="flex shrink-0 gap-1">
                    <IconBtn onClick={() => downloadFile(p.signed_url, `${safeFilename(event.slug)}-${safeFilename(p.guest_name)}-${p.id.slice(0,6)}.jpg`)}><Download size={12} /></IconBtn>
                    <IconBtn onClick={() => delPhoto(p.id)} danger><Trash2 size={12} /></IconBtn>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </Section>

      <Section title="Voice messages">
        {voices.length === 0 ? <Empty msg="No voice notes yet" /> : (
          <ul className="space-y-2">
            {voices.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-card p-3">
                <span className="font-serif italic">{v.guest_name}</span>
                <audio controls src={v.signed_url} className="h-9 grow" />
                <IconBtn onClick={() => downloadFile(v.signed_url, `${safeFilename(event.slug)}-${safeFilename(v.guest_name)}.webm`)}><Download size={14} /></IconBtn>
                <IconBtn onClick={() => delMem(v.id)} danger><Trash2 size={14} /></IconBtn>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Notes">
        {notes.length === 0 ? <Empty msg="No notes yet" /> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {notes.map((n) => (
              <li key={n.id} className="relative rounded-2xl border border-ink/10 bg-card p-4">
                <p className="font-serif text-lg italic">"{n.content}"</p>
                <p className="mt-2 text-xs uppercase tracking-wider text-ink/55">— {n.guest_name}</p>
                <button onClick={() => delMem(n.id)} className="absolute right-3 top-3 text-ink/40 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Guests">
        {guests.length === 0 ? <Empty msg="No guests yet" /> : (
          <ul className="flex flex-wrap gap-2">
            {guests.map((g) => (
              <li key={g.id} className="rounded-full bg-cream-deep/60 px-3 py-1.5 text-sm">{g.name}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream-deep/60 py-2">
      <div className="font-serif text-2xl italic">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink/55">{label}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 font-serif text-2xl italic">{title}</h2>
      {children}
    </section>
  );
}
function Empty({ msg }: { msg: string }) {
  return <p className="rounded-2xl border border-dashed border-ink/15 bg-card/60 px-4 py-6 text-center text-sm text-ink/55">{msg}</p>;
}
function IconBtn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-full ${danger ? "bg-red-500/10 text-red-600 hover:bg-red-500/20" : "bg-cream/80 text-ink hover:bg-cream"}`}>
      {children}
    </button>
  );
}
