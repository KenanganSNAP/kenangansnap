import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandMark } from "@/components/brand-mark";
import { HeaderControls } from "@/components/header-controls";
import { useServerFn } from "@tanstack/react-start";
import { updateMyContactInfo } from "@/lib/kenangan.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — KenanganSnap" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const submitContact = useServerFn(updateMyContactInfo);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupStep, setSignupStep] = useState<"contact" | "account">("contact");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [eventInterest, setEventInterest] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setSignupStep("contact");
  }

  function continueToAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !eventInterest.trim()) {
      toast.error("Please fill in your name, phone, and event interest.");
      return;
    }
    setSignupStep("account");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const redirectTo = `${window.location.origin}/dashboard`;
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;

        // If we have a session (auto-confirm), save the contact info now.
        if (data.session) {
          try {
            await submitContact({
              data: {
                full_name: fullName.trim(),
                phone: phone.trim(),
                company: company.trim() || null,
                event_interest: eventInterest.trim(),
                submit: true,
              },
            });
          } catch (err) {
            // Non-fatal: pending page will let them retry
            console.warn("contact save failed", err);
          }
          toast.success(t("auth.accountCreated"));
          nav({ to: "/dashboard" });
        } else {
          // Email confirmation required — they'll fill the pending form after sign-in.
          toast.success(t("auth.accountCreated"));
          switchMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t("auth.welcomeBackToast"));
        nav({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const showContactStep = mode === "signup" && signupStep === "contact";
  const showAccountStep = mode === "signin" || (mode === "signup" && signupStep === "account");

  return (
    <div className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/" className="text-xs uppercase tracking-[0.3em] text-ink/60 hover:text-ink dark:text-foreground/60 dark:hover:text-foreground">{t("common.backHome")}</Link>
          <HeaderControls />
        </div>
        <Link to="/" className="mb-8 flex justify-center"><BrandMark /></Link>
        <div className="rounded-3xl border border-ink/10 bg-card/80 p-8 shadow-[0_30px_60px_-30px_rgba(40,25,15,0.4)] backdrop-blur dark:border-foreground/10">
          {mode === "signup" && (
            <button
              type="button"
              onClick={() => {
                if (signupStep === "account") setSignupStep("contact");
                else switchMode("signin");
              }}
              className="mb-4 inline-flex items-center gap-1 text-xs uppercase tracking-[0.25em] text-ink/60 hover:text-ink dark:text-foreground/60 dark:hover:text-foreground"
            >
              {signupStep === "account" ? "← Back to your details" : t("auth.haveAccount")}
            </button>
          )}
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.35em] text-ink/60 dark:text-foreground/60">{t("auth.hostPortal")}</div>
            <h1 className="mt-2 font-serif text-3xl italic">
              {mode === "signin"
                ? t("auth.welcomeBack")
                : signupStep === "contact" ? "Tell us about you" : t("auth.createAccount")}
            </h1>
            <p className="mt-1 text-sm text-ink/65 dark:text-foreground/65">
              {mode === "signin"
                ? t("auth.signInSubtitle")
                : signupStep === "contact"
                  ? "Step 1 of 2 — Your details"
                  : "Step 2 of 2 — Account login"}
            </p>
          </div>

          {showContactStep && (
            <form onSubmit={continueToAccount} className="mt-6 space-y-3">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">Full name</span>
                <input
                  type="text" required maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-3 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-card/50"
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">Phone / WhatsApp</span>
                <input
                  type="tel" required maxLength={32} value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-3 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-card/50"
                  placeholder="+60 12 345 6789"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">Company / organization (optional)</span>
                <input
                  type="text" maxLength={100} value={company} onChange={(e) => setCompany(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-3 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-card/50"
                  placeholder="Optional"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">Tell us about your event</span>
                <textarea
                  required maxLength={1000} rows={3} value={eventInterest} onChange={(e) => setEventInterest(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-3 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-card/50"
                  placeholder="Wedding in March, ~150 guests…"
                />
              </label>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-ink py-3 text-sm tracking-wider text-cream transition hover:opacity-90 dark:bg-primary dark:text-primary-foreground"
              >
                Continue →
              </button>
            </form>
          )}

          {showAccountStep && (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">{t("auth.email")}</span>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-3 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-card/50"
                  placeholder="you@kenangan.my"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-ink/60 dark:text-foreground/60">{t("auth.password")}</span>
                <input
                  type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-3 text-sm outline-none focus:border-gold dark:border-foreground/15 dark:bg-card/50"
                  placeholder="••••••••"
                />
              </label>
              <button
                disabled={busy}
                type="submit"
                className="mt-2 w-full rounded-xl bg-ink py-3 text-sm tracking-wider text-cream transition hover:opacity-90 disabled:opacity-60 dark:bg-primary dark:text-primary-foreground"
              >
                {busy ? t("common.loading") : mode === "signin" ? t("auth.signIn") + " →" : t("auth.signUp") + " →"}
              </button>
            </form>
          )}

          {showAccountStep && (
            <>
              <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-ink/40">
                <span className="h-px flex-1 bg-ink/15" /> or <span className="h-px flex-1 bg-ink/15" />
              </div>
              <button
                type="button"
                onClick={async () => {
                  setBusy(true);
                  try {
                    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
                    if (result.error) throw result.error;
                    if (!result.redirected) nav({ to: "/dashboard" });
                  } catch (e) { toast.error((e as Error).message); setBusy(false); }
                }}
                disabled={busy}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-ink/15 bg-cream/70 py-3 text-sm hover:bg-cream disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {t("auth.continueWithGoogle")}
              </button>
            </>
          )}

          <div className="mt-5 text-center text-sm text-ink/65">
            {mode === "signin" ? (
              <>New here? <button onClick={() => switchMode("signup")} className="font-medium text-ink underline">Create an account</button></>
            ) : (
              <>Already a host? <button onClick={() => switchMode("signin")} className="font-medium text-ink underline">Sign in</button></>
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
