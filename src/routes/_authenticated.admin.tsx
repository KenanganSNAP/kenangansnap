import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const loc = useLocation();
  const tabs = [
    { to: "/admin", label: "Hosts" },
    { to: "/admin/events", label: "Events" },
    { to: "/admin/guests", label: "Guests" },
    { to: "/admin/media", label: "Media" },
    { to: "/admin/homepage", label: "Homepage" },
  ];

  return (
    <div className="py-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-ink/60">Admin</div>
      <h1 className="mt-1 font-serif text-4xl italic">Studio control</h1>
      <div className="mt-5 flex gap-1 rounded-full border border-ink/10 bg-card p-1 text-sm">
        {tabs.map((t) => {
          const active = loc.pathname === t.to;
          return (
            <Link key={t.to} to={t.to}
              className={`flex-1 rounded-full px-4 py-2 text-center ${active ? "bg-ink text-cream" : "text-ink/70 hover:bg-ink/5"}`}>
              {t.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-6"><Outlet /></div>
    </div>
  );
}
