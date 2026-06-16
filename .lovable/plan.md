# Plan — Phase 1: Core Admin CMS

Building sections **1, 6, 8** first using **simple structured fields** stored in the existing `site_settings` (jsonb) table. After Phase 1 ships and you confirm, I'll plan Phase 2 (guest-facing: templates, print, dark mode + i18n).

## Section 1 — Public pages + admin-editable content

Three new public routes, each driven by a `site_settings` row:

- `/pricing` — reads `site_settings` key `pricing_page`
- `/how-it-works` — reads key `how_it_works_page`
- `/about` — reads key `about_page`

Each page uses structured fields (no block editor): hero title/subtitle/image, a list of items (tiers / steps / team members), and a closing CTA. Public routes use the server publishable client with the existing anon `SELECT` policy on `site_settings`.

Admin editors live at:
- `/admin/pages/pricing`
- `/admin/pages/how-it-works`
- `/admin/pages/about`

Each editor is a simple form: text inputs, textareas, image uploads (to existing `event-covers` bucket under a `site/` prefix, or new `site-assets` bucket if you prefer), and add/remove/reorder buttons for the item list. Saves go through a `requireSupabaseAuth` server fn that checks `has_role(admin)` and upserts the row.

Navigation: add Pricing, How It Works, About links to the public header on `/` (and shared landing layout).

## Section 6 — Admin homepage content management

Already has `/admin/homepage` — extend it (and create the matching `site_settings` keys + a `homepage_media` table) to manage:

- **Featured photos**: gallery with reorder + delete + "set as hero" flag. New table `homepage_media (id, kind, url, sort_order, is_hero, caption)`.
- **Featured video**: single field on `site_settings.homepage` — either an uploaded video URL or a YouTube/Vimeo embed URL. Auto-detect and render `<iframe>` for YT/Vimeo, `<video>` otherwise.
- **Testimonials**: new table `testimonials (id, author_name, author_photo_url, quote, event_name, sort_order)`.

Homepage (`/`) reads these via the server publishable client (anon `SELECT` policies) and renders them in existing sections, replacing the current placeholder content.

## Section 8 — Admin event overview + editing + audit trail

Extend `/admin/events`:

- Detail view route `/admin/events/$id` showing all event fields, host info, guest count, photo/memory counts.
- Edit form covering every column on `events` (title, type, date, venue, welcome message, cover image, invitation image, reveal_at, is_active).
- Status control: add `status text` column to `events` with values `draft | active | completed | cancelled`. Existing `is_active` stays for backwards compatibility (kept in sync: `active` → true, others → false). Default `active`.
- Audit trail: new table `event_audits (id, event_id, edited_by, edited_at, changed_fields jsonb, note text)`. Every admin-side update inserts a row. Hosts viewing their event in `/dashboard/event/$id` see a banner: "Edited by Admin on {date}" with an expandable list of changed fields.

Server fns:
- `adminUpdateEvent` (`requireSupabaseAuth` + admin role check) — updates event and writes audit row in one transaction (RPC).
- `getEventAudits` — host or admin can read audits for events they own / all events.

## Technical details

### New tables (all in one migration, with GRANTs + RLS)

```text
homepage_media(id, kind, url, sort_order, is_hero, caption, created_at, updated_at)
testimonials(id, author_name, author_photo_url, quote, event_name, sort_order, created_at, updated_at)
event_audits(id, event_id → events, edited_by → auth.users, changed_fields jsonb, note, created_at)
events.status text not null default 'active' check (status in ('draft','active','completed','cancelled'))
```

### RLS

- `homepage_media`, `testimonials`: anon + authenticated SELECT; admin-only INSERT/UPDATE/DELETE via `has_role`.
- `event_audits`: admin INSERT/SELECT; hosts SELECT only rows for events where `host_id = auth.uid()`.
- `site_settings`: already correct; reuse keys `pricing_page`, `how_it_works_page`, `about_page`, `homepage`.

### `site_settings` JSON shapes (simple structured fields)

```text
pricing_page:    { hero:{title,subtitle,image}, tiers:[{name,price,period,features[],cta}], footer_note }
how_it_works:    { hero:{...}, steps:[{title,body,image}], cta:{label,href} }
about_page:      { hero:{...}, mission, team:[{name,role,photo,bio}], cta }
homepage:        { hero_title, hero_subtitle, video_url, video_kind:'youtube'|'vimeo'|'upload' }
```

### Files to add

- Migration: `supabase/migrations/<ts>_admin_cms_phase1.sql`
- Public routes: `src/routes/pricing.tsx`, `how-it-works.tsx`, `about.tsx`
- Admin routes: `src/routes/_authenticated.admin.pages.pricing.tsx`, `.how-it-works.tsx`, `.about.tsx`, `_authenticated.admin.events.$id.tsx`
- Server fns: `src/lib/cms.functions.ts`, `src/lib/admin-events.functions.ts`
- Components: `src/components/cms/PageEditor.tsx` (shared form), `src/components/cms/ListEditor.tsx` (add/remove/reorder)
- Header update for public nav

### Out of scope for Phase 1

- Photo templates, print, dark mode, language toggle, admin-editable Create Event form, admin guest editing — all in Phase 2 plan after your go-ahead.
- Rich-text/WYSIWYG (you chose simple structured fields).

## Confirmation gate

After Phase 1 is implemented and verified, I'll stop and ask before starting Phase 2 (sections 2, 3, 4, 5, 7).
