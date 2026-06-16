import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyHostStatus } from "@/lib/kenangan.functions";
import { BrandMark } from "@/components/brand-mark";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<{ status: string; isAdmin: boolean; email: string | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        nav({ to: "/auth" });
        return;
      }
      try {
        const s = await getMyHostStatus();
        if (mounted) setStatus(s);
      } catch {
        // ignore
      } finally {
        if (mounted) setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) nav({ to: "/auth" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [nav]);

  if (!ready) {
    return <div className="grid min-h-screen place-items-center text-ink/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/dashboard"><BrandMark /></Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/dashboard" className="rounded-full px-3 py-1.5 text-ink/70 hover:bg-ink/5">Events</Link>
          {status?.isAdmin && (
            <Link to="/admin" className="rounded-full bg-gold-soft px-3 py-1.5 text-ink hover:bg-gold/60">Admin</Link>
          )}
          <button
            onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}
            className="inline-flex items-center gap-1 rounded-full border border-ink/15 px-3 py-1.5 text-ink/70 hover:bg-ink/5"
          >
            <LogOut size={14} /> Sign out
          </button>
        </nav>
      </header>
      {status && status.status !== "approved" && !status.isAdmin ? (
        <div className="mx-auto max-w-xl px-5 py-16 text-center">
          <h2 className="font-serif text-3xl italic">Account pending</h2>
          <p className="mt-3 text-ink/70">
            Your host account ({status.email}) is awaiting admin approval. You'll be able to create events as soon as it's approved.
          </p>
        </div>
      ) : (
        <main className="mx-auto max-w-6xl px-5 pb-16"><Outlet /></main>
      )}
    </div>
  );
}
