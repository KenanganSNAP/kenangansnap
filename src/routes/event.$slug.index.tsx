import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getEventBySlug, registerGuest } from "@/lib/kenangan.functions";
import { hasSeenInvitation, loadGuest, markInvitationSeen, newSessionToken, saveGuest } from "@/lib/guest-session";
import { BrandMark } from "@/components/brand-mark";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";


export const Route = createFileRoute("/event/$slug/")({
  component: GuestHome,
});

function GuestHome() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const { t } = useTranslation();

  const { data: event } = useQuery({
    queryKey: ["event-public", slug],
    queryFn: () => getEventBySlug({ data: { slug } }),
  });

  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [askConsent, setAskConsent] = useState(false);

  useEffect(() => {
    if (!event) return;
    setName(loadGuest(slug)?.name ?? "");
    if (event.invitation_signed_url && !hasSeenInvitation(slug)) setShowInvite(true);
  }, [event, slug]);

  if (!event) return null;

  async function openCamera(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const existing = loadGuest(slug);
      const sessionToken = existing?.sessionToken ?? newSessionToken();
      const { guestId } = await registerGuest({ data: { slug, name: name.trim(), sessionToken } });
      saveGuest(slug, { guestId, name: name.trim(), sessionToken, allowDownload: existing?.allowDownload });
      setAskConsent(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function chooseConsent(allowDownload: boolean) {
    const guest = loadGuest(slug);
    if (guest) saveGuest(slug, { ...guest, allowDownload });
    setAskConsent(false);
    nav({ to: "/event/$slug/capture", params: { slug } });
  }


  if (showInvite && event.invitation_signed_url) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-ink/95 p-4">
        <img src={event.invitation_signed_url} alt="Invitation"
          className="max-h-[80vh] w-full max-w-md rounded-3xl object-contain shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]" />
        <button
          onClick={() => { markInvitationSeen(slug); setShowInvite(false); }}
          className="absolute bottom-8 inline-flex items-center gap-2 rounded-full bg-cream px-6 py-3 text-sm tracking-wider text-ink"
        >
          OPEN INVITATION <ChevronDown size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center px-5 pt-8">
      <div className="rounded-full border border-ink/10 bg-cream/70 px-4 py-1.5"><BrandMark size="sm" /></div>

      <div className="mt-6 text-center">
        <div className="text-[10px] uppercase tracking-[0.35em] text-ink/60">The kenangan of</div>
        <h1 className="mt-2 font-script text-6xl text-gold leading-none">{event.title}</h1>
        <div className="mt-2 text-xs italic tracking-wider text-ink/70">
          {event.date ? new Date(event.date).toLocaleDateString() : ""} {event.venue ? ` — ${event.venue}` : ""}
        </div>
      </div>

      {event.cover_signed_url && (
        <div className="mt-6 w-full overflow-hidden rounded-3xl border border-ink/10 shadow-[0_20px_40px_-25px_rgba(40,25,15,0.4)]">
          <img src={event.cover_signed_url} alt="" className="aspect-square w-full object-cover" />
        </div>
      )}

      {event.welcome_message && (
        <p className="mt-6 max-w-sm text-center font-serif text-lg italic text-ink/75">"{event.welcome_message}"</p>
      )}

      <form onSubmit={openCamera} className="mt-8 w-full rounded-3xl border border-ink/10 bg-card p-6 shadow-[0_20px_40px_-25px_rgba(40,25,15,0.3)]">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-soft font-serif italic text-ink">
            {event.title.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <h2 className="mt-3 font-serif text-2xl italic">What's your name?</h2>
          <p className="text-sm text-ink/65">Tell us so the host knows who shared this moment 🌿</p>
        </div>
        <input
          value={name} onChange={(e) => setName(e.target.value)} required maxLength={60}
          placeholder="e.g. Aunty Sarah"
          className="mt-5 w-full rounded-xl border border-ink/15 bg-cream/70 px-4 py-3 text-center italic outline-none focus:border-gold"
        />
        <button disabled={busy || !name.trim()} type="submit"
          className="mt-3 w-full rounded-xl bg-ink py-3 text-sm tracking-wider text-cream disabled:opacity-50">
          {busy ? "…" : "OPEN CAMERA →"}
        </button>
        {event.invitation_signed_url && (
          <button type="button" onClick={() => setShowInvite(true)}
            className="mt-3 w-full text-center text-xs uppercase tracking-[0.25em] text-ink/55 hover:text-ink">
            · View invitation ·
          </button>
        )}
      </form>

      {askConsent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-5 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="consent-title"
            className="w-full max-w-sm rounded-3xl border border-ink/10 bg-card p-6 text-center shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)]">
            <h2 id="consent-title" className="font-serif text-2xl italic">{t("consent.title")}</h2>
            <p className="mt-3 text-sm text-ink/70">{t("consent.description")}</p>
            <div className="mt-6 grid gap-2">
              <button type="button" onClick={() => chooseConsent(true)}
                className="w-full rounded-xl bg-ink py-3 text-sm tracking-wider text-cream">
                {t("consent.yes")}
              </button>
              <button type="button" onClick={() => chooseConsent(false)}
                className="w-full rounded-xl border border-ink/20 py-3 text-sm tracking-wider text-ink/80">
                {t("consent.no")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}
