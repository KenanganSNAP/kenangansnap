# Improvements Plan

## 1. Event lifecycle status (admin-only)

Schema already has `events.status` (text). Formalize four values: `draft | active | completed | cancelled`.

- Migration: set default `'draft'`, add CHECK constraint on the four values, backfill existing rows (anything not in the set → `'active'`).
- Server enforcement: only admins can change `status`. Hosts setting/updating events cannot write `status` (strip it from host updates; admin path keeps it via `adminUpdateEvent`).
- Capture/guest/photo/notes/voice endpoints gate on `status = 'active'` instead of (or in addition to) `is_active`. Draft = hidden from guests, completed/cancelled = read-only, active = live.
- Admin event detail UI already has the Status select — keep it, but add a colored badge in the admin events table and on the host dashboard (read-only for host).

## 2. Remove "Pause / Resume" from host

- `src/routes/_authenticated.dashboard.event.$id.tsx`: remove the Pause/Resume button and the "Live / Paused" pill.
- `src/routes/_authenticated.dashboard.index.tsx`: replace the Live/Paused chip with the new status badge (read-only).
- Keep `toggleEventActive` server fn around for now but stop calling it from the UI (or delete — preference?). I'll delete it to avoid dead code.
- New hosts' events start as `draft` until admin flips to `active`.

## 3. Per-event limits (admin-set)

Add nullable integer columns on `events` with sensible defaults:


| Column       | Default | Min | Meaning                              |
| ------------ | ------- | --- | ------------------------------------ |
| `max_guests` | 50      | 50  | Cap on `guests` rows per event       |
| `max_photos` | 100     | 1   | Cap on `photos` rows                 |
| `max_notes`  | 100     | 1   | Cap on `memories` where type='note'  |
| `max_voice`  | 50      | 1   | Cap on `memories` where type='voice' |
| `max_prints` | 20      | 0   | Cap consumed by the print flow       |


- Admin Event Detail screen: new "Limits" card with five number inputs (validated min ≥ documented minimum). Saved through `adminUpdateEvent`.
- Server enforcement in `joinEvent`, `uploadPhoto`, `submitNote`, `submitVoice`: count current rows for the event, reject with a friendly error when at cap.
- Print flow (`src/lib/print.functions.ts`) honors `max_prints` when assembling a print job.
- Host UI shows usage (e.g. "Photos 37 / 100") read-only.

## 4. Dark/light mode on every page

The `ThemeProvider` and `HeaderControls` (toggle) already exist but the toggle is only mounted on auth + public pages. Make it global:

- Place a small `HeaderControls` in the top bar of `_authenticated.dashboard.tsx`, `_authenticated.admin.tsx`, and `event.$slug.tsx` so every authenticated/admin/guest page has it.
- Audit the most-used pages for hardcoded `text-ink`, `bg-cream`, etc. without dark equivalents and add `dark:` variants where contrast breaks. Focus: dashboard cards, admin tables, capture/album/notes/voice screens.
- QR visibility fix: the QR currently renders with `bgColor="transparent" fgColor="#2a1d14"` — invisible on dark backgrounds. Wrap the QR in a white-padded card (`bg-white p-3 rounded-xl`) regardless of theme so the QR has consistent contrast in both modes. Apply same fix to the printable poster (`src/lib/qr-poster.ts`).

## 5. Hide admin audit log from host

- `_authenticated.dashboard.event.$id.tsx`: remove the "Edited by Admin…" details panel and the `listEventAuditsForHost` query usage.
- Keep the audit log visible in the admin event detail page only.
- Optionally delete `listEventAuditsForHost` to remove the unused server fn.

---

## Other things I'd recommend improving

1. **Status semantics vs `is_active**` — `is_active` becomes redundant once `status` exists. I'll keep the column for backward compatibility but treat `status='active'` as the single source of truth, and stop writing `is_active` from the UI.
2. `**status` CHECK constraint** is important — without it any string can land in the column.
3. **QR poster PDF** — same contrast issue as on-screen QR; fix in one pass.
4. **Cancelled events** — show a clear "This event has been cancelled" message on the guest-facing route instead of a generic "Event not available".
5. **Guest cap UX** — when at cap, the guest-join page should show "Guest list full" rather than a toast error.

## Open questions

- For `max_prints`: is the cap **prints per event** or **prints per guest**? I've assumed per event.
- Should existing live events be migrated to `status='active'` (yes by default) or left for admin review?

If those are fine, say "go" and I'll implement.