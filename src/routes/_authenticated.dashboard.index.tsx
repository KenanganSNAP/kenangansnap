import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMyEvents } from "@/lib/kenangan.functions";
import { Plus, Calendar, Users, Camera, Mic, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Dashboard,
});

function Dashboard() {
  const nav = useNavigate();
  const { data: events, isLoading } = useQuery({
    queryKey: ["my-events"],
    queryFn: () => listMyEvents(),
  });

  return (
    <div className="py-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-ink/60">Your events</div>
          <h1 className="mt-1 truncate font-serif text-4xl italic">Memory booths</h1>
        </div>
        <Link
          to="/dashboard/create"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm text-cream hover:opacity-90"
        >
          <Plus size={16} /> New event
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-10 text-ink/60">Loading…</p>
      ) : !events || events.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-ink/15 bg-card/60 p-10 text-center">
          <h3 className="font-serif text-2xl italic">No events yet</h3>
          <p className="mt-2 text-ink/65">Create your first booth to receive memories from your guests.</p>
          <Link to="/dashboard/create" className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm text-cream">
            Create an event
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <button
              key={e.id}
              onClick={() => nav({ to: "/dashboard/event/$id", params: { id: e.id } })}
              className="group text-left rounded-3xl border border-ink/10 bg-card p-5 transition hover:border-gold hover:shadow-[0_20px_40px_-25px_rgba(40,25,15,0.4)]"
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-ink/55">
                <span>{e.event_type}</span>
                <span className={e.is_active ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700" : "rounded-full bg-ink/10 px-2 py-0.5"}>
                  {e.is_active ? "Live" : "Paused"}
                </span>
              </div>
              <h3 className="mt-3 font-serif text-2xl italic">{e.title}</h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-ink/60">
                <Calendar size={14} />
                {e.date ? new Date(e.date).toLocaleDateString() : "TBA"} {e.venue ? `· ${e.venue}` : ""}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                <Stat icon={Users} label="Guests" value={e.counts.guests} />
                <Stat icon={Camera} label="Photos" value={e.counts.photos} />
                <Stat icon={MessageSquare} label="Notes" value={e.counts.notes} />
                <Stat icon={Mic} label="Voice" value={e.counts.voices} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-cream-deep/60 px-1.5 py-2">
      <Icon size={14} className="mx-auto text-ink/60" />
      <div className="mt-1 font-serif text-lg italic">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink/50">{label}</div>
    </div>
  );
}
