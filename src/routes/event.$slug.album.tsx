import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { listAlbum } from "@/lib/kenangan.functions";
import { downloadFile, safeFilename } from "@/lib/download";
import { Download, X } from "lucide-react";

export const Route = createFileRoute("/event/$slug/album")({
  component: Album,
});

function Album() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["album", slug],
    queryFn: () => listAlbum({ data: { slug } }),
    refetchInterval: 15_000,
  });
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (isLoading) return <Center>Loading…</Center>;
  if (!data) return null;

  if (!data.revealed) return <Countdown revealAt={data.revealAt} />;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6">
      <div className="text-center text-[10px] uppercase tracking-[0.3em] text-ink/55">Album</div>
      <h1 className="text-center font-serif text-3xl italic">{data.items.length} memories</h1>
      {data.items.length === 0 ? (
        <p className="mt-10 text-center text-ink/55">Be the first to share a photo.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.items.map((p) => (
            <button key={p.id} onClick={() => setLightbox(p.signed_url)}
              className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-card">
              <img src={p.signed_url} alt={p.guest_name} className="aspect-square w-full object-cover transition group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/80 to-transparent px-2 py-1.5 text-left text-[11px] italic text-cream">
                {p.guest_name}
              </span>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); downloadFile(p.signed_url, `${safeFilename(slug)}-${safeFilename(p.guest_name)}-${p.id.slice(0,6)}.jpg`); }}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-cream/85 text-ink">
                <Download size={14} />
              </span>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          className="fixed inset-0 z-40 grid place-items-center bg-ink/90 p-4">
          <img src={lightbox} className="max-h-[85vh] max-w-full rounded-2xl" alt="" />
          <button className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-cream text-ink">
            <X size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); downloadFile(lightbox, `${safeFilename(slug)}-photo.jpg`); }}
            className="absolute bottom-6 inline-flex items-center gap-2 rounded-full bg-cream px-5 py-2.5 text-sm text-ink">
            <Download size={16} /> Download
          </button>
        </div>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[60vh] place-items-center text-ink/60">{children}</div>;
}

function Countdown({ revealAt }: { revealAt: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!revealAt) return <Center>Reveal not set</Center>;
  const ms = Math.max(0, new Date(revealAt).getTime() - now);
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (
    <div className="mx-auto max-w-md px-5 pt-12 text-center">
      <div className="text-[10px] uppercase tracking-[0.3em] text-ink/60">Album opens in</div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[["Days", d], ["Hrs", h], ["Min", m], ["Sec", sec]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border border-ink/10 bg-card py-4">
            <div className="font-serif text-3xl italic">{v}</div>
            <div className="text-[10px] uppercase tracking-wider text-ink/55">{l}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink/60">Memories shared now will appear here at the reveal.</p>
    </div>
  );
}
