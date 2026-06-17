# Section 3 — Print Integration

Wire a real print pipeline on top of the local `window.print()` shortcut already on the capture preview. Admin configures one printer endpoint; guests get a pre-print options sheet (copies, include name, template on/off) before sending.

## What guests see (booth capture preview)

After capture, the existing actions stay (Retake / Send to album / local Print). Add a primary **"Send to printer"** button (only when a printer URL is configured). Tapping it opens a small bottom sheet:

- Copies: 1 / 2 / 4 (segmented)
- Include guest name on print: toggle (defaults on if guest entered a name)
- Use selected template: toggle (defaults on; off sends original)
- Confirm → calls `submitPrintJob`, shows success/error toast, closes sheet

The local browser-print button stays as a fallback (useful for testing / no printer configured).

## What admin sees

New card on `/admin/pages` (or a dedicated `/admin/print` route — I'll put it on the existing admin Settings area to avoid route sprawl):

- Printer endpoint URL (text)
- Optional shared secret header value (text, stored as-is in `site_settings.print_config` — not a Lovable secret since it's per-deployment config the admin manages from the UI)
- Default copies (1–4)
- Toggle: allow guests to override copies
- Save button

Stored as a single JSON blob in `site_settings.print_config`.

## Server

New `src/lib/print.functions.ts`:

- `getPrintConfig()` — public read of `site_settings.print_config` (safe fields only: enabled flag, max copies, allow override). Does NOT return the URL or secret.
- `submitPrintJob({ photoId, copies, includeName, useTemplate })` — `requireSupabaseAuth` optional (guests are anon for booth); accept anon. Loads the photo row, picks `photo_url` vs `original_url` based on `useTemplate`, POSTs JSON to `print_config.url` with header `X-Print-Secret` if set. Payload:
  ```json
  { "photoUrl": "...", "eventId": "...", "eventTitle": "...", "guestName": "...", "copies": 2 }
  ```
  Wrapped in try/catch; returns `{ ok: true }` or `{ ok: false, error }`. No DB queue/log (per earlier decision).
- `adminUpdatePrintConfig(...)` — `requireSupabaseAuth` + `has_role('admin')`, writes the full config blob.

## DB

Single migration:

- `site_settings.print_config` JSONB (nullable). Default `null` = printing disabled.
- No new tables. RLS on `site_settings` already in place.

## Files

- New: `src/lib/print.functions.ts`, `src/components/print-options-sheet.tsx`, `src/routes/_authenticated.admin.print.tsx` (admin form), migration.
- Edit: `src/routes/event.$slug.capture.tsx` (replace bare Print button with sheet trigger; keep local print as fallback), `src/routes/_authenticated.admin.tsx` (nav link), `src/locales/en.ts` + `ms.ts` (already have most keys; add a few new ones), `.lovable/plan.md` (mark §3 done).

## Out of scope (saved for later)

- Print job history / retry queue
- Multiple printers per event
- Real driver integration (CUPS/IPP, vendor SDKs) — the configurable HTTP endpoint is the integration seam; whoever runs the booth points it at their own print bridge.

Reply "go" to build, or tell me what to change.
