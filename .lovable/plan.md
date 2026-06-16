
# KenanganSnap — Core MVP Plan (v3)

Changes in this revision:
- **Boomerang removed everywhere.**
- **Per-item download** for every photo and voice memory across guest, host, and admin views.
- **Invitation photo**: hosts (and admin) can upload an invitation image per event. It's shown full-bleed on the guest welcome screen the first time the QR is scanned (and on every revisit until they enter the album).

A mobile-first event memory app. Guests scan a QR, see the invitation, drop their name, then capture photos (with film filters), write notes, and leave voice messages. Hosts manage events from a dashboard. One admin oversees everyone.

## Scope (this build)

In: host auth + admin-approved access, event create/manage, invitation photo upload, QR generation, guest name flow, photo capture with CSS film filters, notes, voice memory, album with reveal-timer countdown, per-item download, admin panel.

Deferred: video capture, PWA install, zip export of an entire event, pre-upload moderation queue (host can still delete after upload).

## User flows

### Guest (no login)
```text
QR → /event/:slug
       → Invitation splash (full-bleed invitation_image_url)
         [ Open Invitation ↓ ]
       → Welcome + name modal
       → Bottom nav
            ├── Capture  (camera + 5 CSS filters → upload)
            ├── Album    (countdown until reveal_at, then grid + download)
            ├── Notes    (textarea → memories)
            └── Voice    (hold-to-record ≤60s → memories + download)
```

The invitation splash is the very first screen on scan. It uses `localStorage` to remember "invitation seen", so revisits skip straight to the welcome/name step but the invitation is always reachable via a small "View invitation" link in the welcome header.

### Host (Supabase Auth, admin-approved)
```text
/register → pending screen → (admin approves) → /login
   → /dashboard
       ├── /dashboard/create        (incl. cover + invitation upload)
       └── /dashboard/event/:id     (QR, stats, replace invitation, toggle active, download/delete media)
```

### Admin (kenanganboothbn@gmail.com)
```text
/admin
   ├── Hosts   (list, approve pending, suspend, delete)
   ├── Events  (browse any, replace invitation, deactivate)
   ├── Guests  (list across all events)
   └── Media   (download or delete any photo/note/voice)
```

## Wireframes

Invitation splash (first scan):
```text
┌──────────────────────────┐
│                          │
│   [ invitation image ]   │
│      full-bleed PNG      │
│                          │
│   Aisha & Daniel         │
│   12 Apr 2026 · KLCC     │
│                          │
│  [   Open Invitation ↓  ]│
└──────────────────────────┘
```

Guest welcome:
```text
┌──────────────────────────┐
│   [cover photo banner]   │
│   Aisha & Daniel         │
│   12 Apr 2026 · KLCC     │
│   "Bismillah, welcome…"  │
│   ┌────────────────────┐ │
│   │ What's your name?  │ │
│   │ [_________] Enter  │ │
│   └────────────────────┘ │
│   · View invitation ·    │
└──────────────────────────┘
```

Capture (photo-only):
```text
┌──────────────────────────┐
│ ◀  Capture           ⚙  │
│ ┌──────────────────────┐ │
│ │   live camera feed   │ │
│ │   (CSS filter on)    │ │
│ └──────────────────────┘ │
│ None Warm Fade Noir Gold │
│        (  ⬤  )           │
│ [ Home Capture Album … ] │
└──────────────────────────┘
```

Album (post-reveal, with download):
```text
┌──────────────────────────┐
│ Album · 87 photos        │
│ ┌────┐ ┌────┐ ┌────┐    │
│ │ 📷⬇│ │ 📷⬇│ │ 📷⬇│    │
│ └────┘ └────┘ └────┘    │
│ Tap → fullscreen + [⬇]  │
└──────────────────────────┘
```

Voice list:
```text
┌──────────────────────────┐
│ 🎙 Aisha    ▶  0:42  ⬇  │
│ 🎙 Daniel   ▶  0:18  ⬇  │
└──────────────────────────┘
```

Host event mgmt:
```text
┌──────────────────────────┐
│ Aisha & Daniel  [Active] │
│ ┌──────────┐  Guests  24 │
│ │   QR     │  Photos  87 │
│ │  (png)   │  Notes   12 │
│ └──────────┘  Voice    6 │
│ [Copy link] [Download QR]│
│ Invitation: [Replace ↑]  │
│ Recent uploads ▾ [⬇][🗑] │
└──────────────────────────┘
```

## Database (Supabase, all in `public`)

- `events`: per spec PLUS new column `invitation_image_url text` (nullable — if null, splash is skipped).
- `guests`, `photos`, `memories` per spec.
- `photos.media_type` constrained to `'photo'` for MVP.
- `app_role` enum (`admin`,`host`); `user_roles(user_id, role)` with security-definer `has_role()`.
- `hosts(user_id pk, status in ('pending','approved','suspended'), email, created_at)` populated by signup trigger — `pending` by default, auto-approved for the admin email.
- `events.reveal_at` nullable (null = instant reveal).
- Storage buckets (public read): `event-covers`, `event-invitations`, `photos`, `audio-memories`. Inserts gated by RLS-checked DB rows.

### RLS summary
- `events`: host CRUD where `host_id = auth.uid()` AND approved; admin full; anon SELECT when `is_active = true`.
- `guests`: anon INSERT for active events; anon SELECT own row by `session_token`; host SELECT own event; admin full.
- `photos`/`memories`: anon INSERT when event active; anon SELECT when `is_active` AND (`reveal_at` is null OR `now() >= reveal_at`); host SELECT/DELETE own event; admin full.
- `hosts` / `user_roles`: user reads own; admin full.
- Explicit `GRANT`s to `anon`, `authenticated`, `service_role` on every public table.

## Download behavior

- Public buckets → each row carries a direct `storage_url` / `audio_url`.
- UI download buttons run: fetch → `Blob` → `URL.createObjectURL` → anchor with `download="kenangansnap-<slug>-<guest>-<id>.<ext>"`, then `revokeObjectURL`. Needed because cross-origin `download` attributes are ignored on iOS Safari.
- One shared helper `src/lib/download.ts` reused across album lightbox, voice list, host moderation, and admin media views.
- Server gates list endpoints on `reveal_at`, so URLs aren't even returned to guests pre-reveal.

## Invitation upload

- Field in create-event form (optional) and a "Replace invitation" control on the event management page.
- Allowed: PNG/JPG/WebP up to 5 MB; client-side resize to max 1600 px wide before upload.
- Stored in `event-invitations/<event_id>.<ext>` with overwrite-on-replace; public URL written back to `events.invitation_image_url`.
- Admin can replace it from `/admin/events` using the same server fn (auth + `has_role('admin')`).

## Frontend routes (TanStack file-based)

```text
src/routes/
  index.tsx                       landing
  auth.tsx                        login + register tabs
  _authenticated/
     route.tsx                    (managed gate)
     dashboard.index.tsx
     dashboard.create.tsx
     dashboard.event.$id.tsx
     admin.tsx                    admin layout (gate on has_role('admin'))
     admin.index.tsx
     admin.hosts.tsx
     admin.events.tsx
     admin.guests.tsx
  event.$slug.tsx                 guest layout (invitation splash + bottom nav + name modal)
  event.$slug.index.tsx
  event.$slug.capture.tsx         photo only
  event.$slug.album.tsx           grid + per-item download
  event.$slug.notes.tsx
  event.$slug.voice.tsx           list + per-item download
```

## Server functions (`src/lib/*.functions.ts`)

Public: `getEventBySlug` (returns `invitation_image_url`), `registerGuest`, `submitNote`, `uploadPhoto`, `uploadVoice`, `listAlbum` (enforces reveal_at), `listVoice` (enforces reveal_at).

Auth-required (`requireSupabaseAuth`): `listMyEvents`, `createEvent`, `updateEventInvitation`, `getEventStats`, `listEventMedia`, `deletePhoto`, `deleteMemory`, `toggleEventActive`.

Admin-only (`has_role('admin')`): `listHosts`, `approveHost`, `suspendHost`, `deleteHost`, `listAllEvents`, `adminUpdateEventInvitation`, `listAllGuests`, `adminDeleteMedia`.

## Admin seeding

Migration grants `admin` role to the user whose `auth.users.email = 'kenanganboothbn@gmail.com'` (no-op if not signed up); signup trigger re-checks and grants admin + auto-approves the host row on first registration with that email.

## Tech notes

- QR via `qrcode.react` (SVG on screen; canvas → PNG with title/date watermark for download).
- Camera: `getUserMedia` + `<video>` with `filter:` CSS; capture via offscreen `<canvas>` re-applying `ctx.filter`, exported as JPEG.
- Voice: `MediaRecorder` (audio/webm), 60s cap.
- Image resize (invitation/cover): canvas-based, no extra deps.
- Styling: Tailwind v4 tokens in `src/styles.css` — cream `#f8f1e8`, dusty rose, gold; DM Sans via `<link>` in root head.
- Toasts via shadcn `sonner`.

## Build order

1. Enable Lovable Cloud + migrations (schema incl. `invitation_image_url`, RLS, GRANTs, admin trigger, four buckets).
2. Auth pages + pending-approval screen + admin gate.
3. Guest invitation splash + welcome + name modal + session_token.
4. Capture (photo + filters) → upload, notes, voice.
5. Album + voice list with reveal countdown and per-item download.
6. Host dashboard: list, create (with invitation), event mgmt (QR, stats, replace invitation, download/delete).
7. Admin panel: hosts, events (replace invitation), guests, media (download/delete).
8. Landing page + polish + end-to-end verification.

## Open assumptions (flag if wrong)

- Email/password only for hosts (no Google sign-in).
- Public Storage buckets so direct download/invitation rendering works. Can switch to short-lived signed URLs if you want files private.
- Invitation splash shows once per device (remembered via `localStorage`), always reachable from welcome header.
- Video capture stays deferred — Capture is photo-only for MVP.
