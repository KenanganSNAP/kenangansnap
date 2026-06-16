import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/brand-mark";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — KenanganSnap" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const redirectTo = `${window.location.origin}/dashboard`;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        toast.success("Account created — check your email if confirmation is on, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        nav({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex justify-center"><BrandMark /></Link>
        <div className="rounded-3xl border border-ink/10 bg-card/80 p-8 shadow-[0_30px_60px_-30px_rgba(40,25,15,0.4)] backdrop-blur">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.35em] text-ink/60">Host portal</div>
            <h1 className="mt-2 font-serif text-3xl italic">
              {mode === "signin" ? "Welcome back" : "Create host account"}
            </h1>
            <p className="mt-1 text-sm text-ink/65">
              {mode === "signin"
                ? "Sign in to manage your event memories."
                : "New hosts are reviewed before going live."}
            </p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-ink/60">Email</span>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-3 text-sm outline-none focus:border-gold"
                placeholder="you@kenangan.my"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-ink/60">Password</span>
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-3 text-sm outline-none focus:border-gold"
                placeholder="••••••••"
              />
            </label>
            <button
              disabled={busy}
              type="submit"
              className="mt-2 w-full rounded-xl bg-ink py-3 text-sm tracking-wider text-cream transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "SIGN IN →" : "CREATE ACCOUNT →"}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-ink/65">
            {mode === "signin" ? (
              <>New here? <button onClick={() => setMode("signup")} className="font-medium text-ink underline">Create an account</button></>
            ) : (
              <>Already a host? <button onClick={() => setMode("signin")} className="font-medium text-ink underline">Sign in</button></>
            )}
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-ink/50">
          Guests don't need an account — just scan the QR.
        </div>
      </div>
    </div>
  );
}
