## Goal
New signups land on a "waiting for approval" page where they can submit contact info. Admins are notified by email and can approve, reject, or edit the contact info from the admin panel. Admins can also opt in/out of receiving notification emails.

## Database changes (one migration)
- Extend `public.hosts` with: `full_name`, `phone`, `company`, `event_interest` (text), `contact_updated_at`.
- Change the `handle_new_user` trigger so new hosts default to `status = 'pending'` (not `'approved'`). The seeded admin email stays auto-approved.
- Add `public.admin_notification_prefs` table: `user_id` (PK → auth.users), `notify_new_signups` boolean default `true`. Admins read/write only their own row; service role full access. (This is the "admin can opt in/out" toggle.)
- RLS already lets hosts read/update their own row — extend the update policy so a pending host can edit their own contact fields, but not `status` or `email`.

## Server functions (`src/lib/kenangan.functions.ts` + new file)
- `getMyHost()` — returns full host row (status + contact fields) for the pending page.
- `updateMyContactInfo({ full_name, phone, company, event_interest })` — host updates own contact info (auth + Zod validation, max lengths).
- `adminUpdateHostContact({ userId, ...fields })` — admin edits any host's contact info.
- Extend `listHosts()` to return the contact fields for the admin table.
- New `getMyAdminPrefs()` / `updateMyAdminPrefs({ notify_new_signups })`.
- New `sendNewSignupNotification({ hostUserId })` — internal helper called from a trigger route (see below).

## Pending-approval page
- New route `src/routes/_authenticated/dashboard/pending.tsx` (or gate inside existing dashboard layout): if `host.status !== 'approved'`, redirect/render the pending screen instead of the dashboard.
- Screen shows: status badge, explanatory copy, and a contact-info form (name / phone / company / event interest) with save button. Re-submitting updates the row; admin sees latest.
- Approved hosts continue to the normal dashboard. Suspended hosts see a suspended message.

## Admin panel updates (`_authenticated.admin.index.tsx`)
- Hosts table gains contact columns + an "Edit contact" dialog (admin-editable name/phone/company/event interest).
- Highlight rows with `status='pending'`; quick Approve / Suspend buttons (already exist via `setHostStatus`).
- New "Notification preferences" card at top: toggle "Email me when a new host signs up". Persists to `admin_notification_prefs`.

## Email notification to admins
- Prereqs: domain is already configured per the user. Run `email_domain--setup_email_infra` if not yet set up, then `email_domain--scaffold_transactional_email`.
- New React Email template `src/lib/email-templates/admin-new-signup.tsx`: shows host email, signup time, contact info (if any), and a link back to `/admin`.
- New public action route `src/routes/api/public/notify-new-signup.ts` — called by a Postgres trigger via `pg_net` after a `hosts` insert. Verifies an HMAC header (`NEW_SIGNUP_WEBHOOK_SECRET`, added via `add_secret`), looks up all users with `admin` role whose `admin_notification_prefs.notify_new_signups` is true (default true), and enqueues one email per admin through `/lovable/email/transactional/send` using service-role auth.
- DB trigger on `public.hosts` after insert calls `pg_net.http_post` to that route with the new host_id and HMAC signature.

## UX details
- Contact form uses Zod (trim, max 100/30/100/1000 chars). Toast on save.
- Pending page mounted with `HeaderControls` for theme/lang.
- Admin "Edit contact" dialog reuses the same Zod schema.

## Out of scope
- Per-admin assignment of "which specific account receives notifications for which signup" — the toggle covers opt-in/out per admin, which matches "admin can also assign or not assign any specific account to receive". If you want one specific admin to own a given signup (assignment workflow), say so and I'll add an `assigned_admin_id` to `hosts` in a follow-up.
