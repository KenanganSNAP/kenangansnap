import { Link, useLocation } from "@tanstack/react-router";
import { Camera, Image as ImageIcon, MessageSquareHeart, Mic, Home } from "lucide-react";

export function BottomNav({ slug }: { slug: string }) {
  const loc = useLocation();
  const items = [
    { to: `/event/${slug}`, label: "Home", icon: Home, exact: true },
    { to: `/event/${slug}/capture`, label: "Capture", icon: Camera },
    { to: `/event/${slug}/album`, label: "Album", icon: ImageIcon },
    { to: `/event/${slug}/notes`, label: "Notes", icon: MessageSquareHeart },
    { to: `/event/${slug}/voice`, label: "Voice", icon: Mic },
  ];
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
      <div className="pointer-events-auto mx-3 w-full max-w-md rounded-2xl border border-ink/10 bg-cream/90 px-2 py-2 shadow-[0_10px_40px_-15px_rgba(40,25,15,0.35)] backdrop-blur">
        <ul className="grid grid-cols-5 gap-1">
          {items.map((it) => {
            const active = it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] uppercase tracking-wider transition ${
                    active ? "bg-ink text-cream" : "text-ink/70 hover:bg-ink/5"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
