import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getEventBySlug } from "@/lib/kenangan.functions";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/event/$slug")({
  component: EventLayout,
});

function EventLayout() {
  const { slug } = Route.useParams();
  const loc = useLocation();
  const { data: event, isLoading } = useQuery({
    queryKey: ["event-public", slug],
    queryFn: () => getEventBySlug({ data: { slug } }),
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center text-ink/55">Loading…</div>;
  if (!event) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-serif text-3xl italic">Event not found</h1>
          <p className="mt-2 text-ink/65">Please double-check the QR code or link.</p>
        </div>
      </div>
    );
  }
  if (!event.is_active) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="font-serif text-3xl italic">{event.title}</h1>
          <p className="mt-2 text-ink/65">This booth is paused. Please come back later.</p>
        </div>
      </div>
    );
  }

  // Hide bottom nav on index (welcome) since invitation/name take over.
  const showNav = loc.pathname !== `/event/${slug}`;

  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      {showNav && <BottomNav slug={slug} />}
    </div>
  );
}
