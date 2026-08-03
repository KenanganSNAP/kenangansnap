// Lightweight per-event guest session stored in localStorage.
export type GuestSession = {
  guestId: string;
  name: string;
  sessionToken: string;
  allowDownload?: boolean;
};


const key = (slug: string) => `kenangansnap:guest:${slug}`;
const seenKey = (slug: string) => `kenangansnap:invitation-seen:${slug}`;

export function loadGuest(slug: string): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(slug));
    return raw ? (JSON.parse(raw) as GuestSession) : null;
  } catch {
    return null;
  }
}

export function saveGuest(slug: string, session: GuestSession) {
  localStorage.setItem(key(slug), JSON.stringify(session));
}

export function markInvitationSeen(slug: string) {
  localStorage.setItem(seenKey(slug), "1");
}

export function hasSeenInvitation(slug: string) {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(seenKey(slug)) === "1";
}

export function newSessionToken() {
  return crypto.randomUUID();
}
