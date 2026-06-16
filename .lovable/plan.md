# Phase 2 Plan — Guest-Facing & Operations

Building sections 2, 3, 4, 5, 7 on top of Phase 1. Each section is scoped so we can ship and verify it independently before moving on.

## Section 2 — Photo Templates (booth overlays/frames)

- New table `photo_templates` (id, name, kind: 'frame'|'overlay'|'layout', preview_url, asset_url, config jsonb, is_active, sort_order). Admin CRUD at `/admin/templates` with image upload to `site-assets`.
- New per-event link table `event_templates` (event_id, template_id, sort_order). Host picks which templates are available for their event from the event edit screen.
- Booth UI (existing capture flow) gets a horizontal template picker. Selected template is composited onto the captured photo before upload (client-side canvas).
- Stored photo keeps the composited result; original is kept too (new column `photos.original_url`).

## Section 3 — Print Integration

- Abstraction only — no real printer wiring yet.
- New env/setting: `PRINT_SERVER_URL` (admin-editable in `site_settings.print_config`).
- Server fn `submitPrintJob({ photoId })` POSTs to that URL with photo URL + event metadata. Wrapped in try/catch; failures surface as a toast in booth UI.
- "Print" button appears in booth/review screen after capture. Disabled if no print URL configured.
- No DB queue/log (per your earlier choice).

## Section 4 — Customisable Create Event Form (admin-editable)

- New `site_settings.create_event_form` JSONB: ordered list of field definitions (key, label, type: text|textarea|date|image|toggle, required, help_text, visible).
- Admin editor at `/admin/pages/create-event-form` using the existing simple structured-field pattern (reorder, toggle visible/required, edit labels & help text). Field `key`s are a fixed allowlist (title, event_date, venue, cover_image, welcome_message, etc.) — admin can't invent new DB columns, only reshape what's shown.
- `/dashboard/create` reads the config and renders fields dynamically; the auto-slug + Customize UI built last turn stays as-is.

## Section 5 — Dark Mode + i18n (EN/ID)

- **Dark mode**: add `next-themes`, theme toggle in header, ensure tokens in `src/styles.css` already have dark variants (audit + fill gaps). Persist preference in localStorage.
- **i18n**: add `react-i18next` with `en` + `id` locales. Translate nav, buttons, form labels, validation/error/toast messages, auth screens, booth/guest flow, admin panel UI (per your "all of them" answer). Static marketing copy (About/How It Works/Pricing) stays English in this pass — admin can localise later via CMS.
- Language toggle in header, persisted in localStorage + `<html lang>`.

## Section 7 — Admin Guest Editing

- Extend `/admin/events/$id` with a Guests tab: list `guests` for that event, edit name/email/phone/RSVP, soft-delete, resend invitation.
- New `adminUpdateGuest` / `adminDeleteGuest` server fns with `requireSupabaseAuth` + `has_role('admin')`. Audit rows written to `event_audits` (reuse) with `entity_type` discriminator — small migration adds `entity_type text default 'event'` and `entity_id uuid` columns to keep audit generic.
- Hosts retain their existing per-event guest management; nothing changes for them.

## Sequencing & confirmation gates

I'll build in this order and stop for your approval between each:

1. Section 5 (dark mode + i18n) — touches the whole UI, best to land first so later screens are translated as built.
2. Section 4 (customisable Create Event form).
3. Section 2 (photo templates).
4. Section 3 (print integration).
5. Section 7 (admin guest editing + audit generalisation).

## Things I'd like you to confirm or add

1. **Languages**: EN + Bahasa Melayu (BM). Add any others? No
2. **Template compositing**: client-side canvas overlay is simplest and works on mobile. OK, or do you want server-side rendering (slower, needs a Worker-safe image lib)? I go with client-side canvas overlay
3. **Print payload**: I'll send `{ photoUrl, eventId, eventTitle, guestName?, copies: 1 }` as JSON to `PRINT_SERVER_URL`. Add/remove fields? give options to add/remove before printing
4. **Admin guest editing scope**: edit + soft-delete + resend invite. Want bulk import (CSV) too, or save that for later? save that for later
5. **Create Event form**: admin can reorder/relabel/hide existing fields only (no new custom fields). Confirm — or do you want admin-defined custom fields stored in `events.custom_data` jsonb? yes

Reply with answers (or "go" to accept defaults) and I'll start with Section 5.