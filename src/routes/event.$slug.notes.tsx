import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listMemories, submitNote } from "@/lib/kenangan.functions";
import { loadGuest } from "@/lib/guest-session";

export const Route = createFileRoute("/event/$slug/notes")({
  component: Notes,
});

function Notes() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const { data } = useQuery({
    queryKey: ["memories", slug],
    queryFn: () => listMemories({ data: { slug } }),
  });

  useEffect(() => {
    if (!loadGuest(slug)) nav({ to: "/event/$slug", params: { slug } });
  }, [slug, nav]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const guest = loadGuest(slug); if (!guest) return;
    setBusy(true);
    try {
      await submitNote({ data: { slug, guestId: guest.guestId, guestName: guest.name, content: content.trim() } });
      toast.success("Note sent");
      setContent("");
      qc.invalidateQueries({ queryKey: ["memories", slug] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <div className="text-center text-[10px] uppercase tracking-[0.3em] text-ink/55">Notes</div>
      <h1 className="text-center font-serif text-3xl italic">Leave a wish</h1>
      <form onSubmit={send} className="mt-5 rounded-3xl border border-ink/10 bg-card p-5">
        <textarea
          value={content} onChange={(e) => setContent(e.target.value)} required maxLength={500} rows={5}
          placeholder="Write a doa, a memory, a joke…"
          className="w-full resize-none rounded-2xl border border-ink/15 bg-cream/70 p-4 font-serif italic outline-none focus:border-gold"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-ink/50">{content.length}/500</span>
          <button disabled={busy || !content.trim()} className="rounded-full bg-ink px-5 py-2 text-sm text-cream disabled:opacity-50">
            {busy ? "Sending…" : "Send wish"}
          </button>
        </div>
      </form>

      {data?.revealed && data.notes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-center font-serif text-2xl italic">From others</h2>
          <ul className="mt-4 space-y-3">
            {data.notes.map((n) => (
              <li key={n.id} className="rounded-2xl border border-ink/10 bg-card p-4">
                <p className="font-serif text-lg italic">"{n.content}"</p>
                <p className="mt-2 text-xs uppercase tracking-wider text-ink/55">— {n.guest_name}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
