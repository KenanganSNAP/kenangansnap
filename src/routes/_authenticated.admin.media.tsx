import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listAllMedia, adminDeletePhoto, adminDeleteMemory } from "@/lib/kenangan.functions";
import { downloadFile, safeFilename } from "@/lib/download";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/media")({
  component: AdminMedia,
});

function AdminMedia() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-media"], queryFn: () => listAllMedia() });

  async function delP(id: string) {
    if (!confirm("Delete this photo?")) return;
    await adminDeletePhoto({ data: { id } });
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["admin-media"] });
  }
  async function delM(id: string) {
    if (!confirm("Delete this memory?")) return;
    await adminDeleteMemory({ data: { id } });
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["admin-media"] });
  }

  if (isLoading || !data) return <p className="text-ink/60">Loading…</p>;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 font-serif text-2xl italic">Photos ({data.photos.length})</h2>
        {data.photos.length === 0 ? <Empty msg="No photos yet" /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.photos.map((p) => (
              <figure key={p.id} className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-card">
                <img src={p.signed_url} alt={p.guest_name} className="aspect-square w-full object-cover" loading="lazy" />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-ink/80 to-transparent p-2 text-xs text-cream">
                  <span className="truncate italic">{p.guest_name} · {p.event?.title ?? "—"}</span>
                  <div className="flex shrink-0 gap-1">
                    <IconBtn onClick={() => downloadFile(p.signed_url, `${safeFilename(p.event?.slug ?? "event")}-${safeFilename(p.guest_name)}.jpg`)}><Download size={12} /></IconBtn>
                    <IconBtn danger onClick={() => delP(p.id)}><Trash2 size={12} /></IconBtn>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl italic">Voice ({data.voices.length})</h2>
        {data.voices.length === 0 ? <Empty msg="No voice notes" /> : (
          <ul className="space-y-2">
            {data.voices.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-card p-3">
                <span className="font-serif italic">{v.guest_name}</span>
                <span className="text-xs text-ink/55">{v.event?.title ?? "—"}</span>
                <audio controls src={v.signed_url} className="h-9 grow" />
                <IconBtn onClick={() => downloadFile(v.signed_url, `${safeFilename(v.event?.slug ?? "event")}-${safeFilename(v.guest_name)}.webm`)}><Download size={14} /></IconBtn>
                <IconBtn danger onClick={() => delM(v.id)}><Trash2 size={14} /></IconBtn>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-2xl italic">Notes ({data.notes.length})</h2>
        {data.notes.length === 0 ? <Empty msg="No notes" /> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.notes.map((n) => (
              <li key={n.id} className="relative rounded-2xl border border-ink/10 bg-card p-4">
                <p className="font-serif text-lg italic">"{n.content}"</p>
                <p className="mt-2 text-xs uppercase tracking-wider text-ink/55">— {n.guest_name} · {n.event?.title ?? "—"}</p>
                <button onClick={() => delM(n.id)} className="absolute right-3 top-3 text-ink/40 hover:text-red-600"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
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
