# Plan

## 1. Admin can promote another user to admin
- Add server fn `grantAdminByEmail({ email })` in `src/lib/kenangan.functions.ts`:
  - Guarded by `requireSupabaseAuth` + `has_role(admin)` check.
  - Looks up user via `supabaseAdmin.auth.admin` listUsers, then inserts into `user_roles (user_id, role='admin')` (ignore conflict).
  - Also adds revoke variant `revokeAdmin({ userId })`.
- Add a new "Admins" section on `/admin` (hosts page) with:
  - Input + "Make admin" button.
  - List of current admins with a "Revoke" button (cannot revoke self).

## 2. Admin delete controls
- Add server fns `adminDeleteEvent({ eventId })` and `adminDeleteGuest({ guestId })` (admin-only). Event delete cascades photos/memories/guests via FK or explicit cleanup.
- `src/routes/_authenticated.admin.events.tsx`: add red "Delete" button per row (with confirm).
- `src/routes/_authenticated.admin.guests.tsx`: add "Delete" button per row.
- `src/routes/_authenticated.admin.media.tsx`: already has delete — verify it works; no change unless missing.

## 3. Signup "Back" button
- In `src/routes/auth.tsx`, when `mode === "signup"` show a back arrow at top-left of the card that returns to `signin`. Also add a top-level "← Back to home" link above the card on both modes.

## 4. Host login after signup
- Current `handle_new_user()` trigger creates hosts with status `pending`; nothing in the app blocks login, but to make the flow obvious change new-host default to `approved` (admin can suspend later from the admin panel).
- Migration: alter `handle_new_user()` so non-admin signups get `status='approved'`.
- Confirm `/dashboard` does not gate by status (it doesn't currently). After signup the user can immediately sign in with email+password (auto-confirm email is already on).

## 5. Admin-editable homepage
- New table `public.site_settings` (singleton row, key `homepage`) storing JSON: `hero_eyebrow`, `hero_title_line1`, `hero_title_line2`, `hero_subtitle`, `cta_primary`, `cta_secondary`, `section_title`, `section_subtitle`, `features[4]{title,body}`, `footer_note`.
  - RLS: public SELECT (anon+authenticated), admin-only UPDATE via `has_role`.
  - Seeded with current copy.
- Server fns: `getHomepageSettings()` (public via server publishable client) and `updateHomepageSettings({ settings })` (admin-only).
- New route `src/routes/_authenticated.admin.homepage.tsx` with a form for every field + Save.
- Add "Homepage" tab to admin nav in `_authenticated.admin.tsx`.
- `src/routes/index.tsx` loads settings via loader → `useSuspenseQuery` and renders dynamic copy (falls back to current defaults if fetch fails).

## Technical notes
- All admin fns: `.middleware([requireSupabaseAuth])` + verify `has_role(userId,'admin')` then dynamic-import `supabaseAdmin` only where needed (user lookup, cross-user role grants).
- Homepage public read uses the publishable server client per `tanstack-supabase-integration` (narrow `TO anon` SELECT policy on `site_settings`).
- Admin homepage route stays under `_authenticated/admin/*` (already gated).

## Files
- new: `src/routes/_authenticated.admin.homepage.tsx`
- edit: `src/lib/kenangan.functions.ts`, `src/routes/_authenticated.admin.tsx`, `src/routes/_authenticated.admin.index.tsx`, `src/routes/_authenticated.admin.events.tsx`, `src/routes/_authenticated.admin.guests.tsx`, `src/routes/auth.tsx`, `src/routes/index.tsx`
- migrations: alter `handle_new_user()`, create `site_settings` table + RLS + seed
