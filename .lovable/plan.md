# Section 7 — Admin Guest Editing

Reality check on the data model: `guests` table only has `name`, `event_id`, `session_token`, `created_at`. There's no email, phone, RSVP, or invitation system — guests join anonymously via QR code at the event. So I'll scope this section to what actually maps to the schema and explicitly defer the rest.

## In scope

### Per-event guest tab
- Add a **Guests tab** to `/admin/events/$id` (currently shows host + counts + audit log). New tab strip: "Overview" (existing) / "Guests".
- Guests view lists every guest for that event: name, joined time, photo count (already counted in overview), and per-row actions.
- Actions per guest: **Edit name** (inline), **Delete** (with confirm).

### Global guest table upgrade
- The existing `/admin/guests` (all guests across all events) gains the same **Edit name** inline action next to Delete.
- Add a search box (filter by name / event title, client-side over the existing query) and a per-event filter dropdown.

### Server functions
- `adminUpdateGuest({ guestId, name })` — `requireSupabaseAuth` + admin role check, validates name (1–60 chars), updates row, writes audit entry.
- Reuse the existing `adminDeleteGuest`; extend it to write an audit entry on delete.

### Audit log generalisation
- Migration adds `entity_type text not null default 'event'` and `entity_id uuid` to `event_audits`. Backfill: `update event_audits set entity_id = event_id where entity_id is null`.
- Keep `event_id` for now (don't drop) so existing admin event detail UI keeps working unchanged.
- Guest edits/deletes insert with `entity_type='guest'`, `entity_id=<guest_id>`, and the guest's `event_id` so they still surface on the event detail audit list.
- Admin event detail audit list keeps current query (filtered by `event_id`); no UI change needed.

### Files
- New: `src/lib/admin-guests.functions.ts` (or extend `admin-events.functions.ts`), migration for `event_audits`.
- Edit: `src/routes/_authenticated.admin.events.$id.tsx` (add tabs + guests panel), `src/routes/_authenticated.admin.guests.tsx` (edit + filter), small additions to en/ms locales.

## Out of scope (deferred, explicit)

- **Email / phone / RSVP / resend invitation** — none of these fields exist on `guests`. Adding them is a separate feature ("guest contact + RSVP system") that requires schema, an email provider, and UI for both hosts and guests. I'll flag this as a future feature in the plan file rather than half-build it here.
- **Bulk CSV import** — confirmed deferred earlier.

Reply "go" to build, or tell me to also scaffold the contact/RSVP fields now (will be a bigger change).
