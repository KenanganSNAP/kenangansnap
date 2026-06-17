## Goal

New hosts must submit their contact information first. Only after submission does the host become visible/approvable in the admin panel with their details shown.

## Flow

1. New user signs up → `hosts.status = 'pending'` (already the case), plus a new sub-state `contact_submitted = false`.
2. Pending page (`/dashboard/pending`) shows the contact form with required fields. The "Approval requested" / waiting-for-admin copy is **hidden** until the form is submitted.
3. On submit → set `contact_submitted = true`, stamp `contact_updated_at`, switch the pending page to the "waiting for admin approval" view (read-only summary of what they submitted, with an "Edit" toggle).
4. Admin panel hosts list:
   - **Hides** pending hosts who have not yet submitted contact info (or shows them in a collapsed "Awaiting contact info" section, greyed out, no Approve button).
   - **Shows** pending hosts who have submitted, with full contact details and the Approve / Suspend / Edit Contact actions already in place.
   - Bell badge count in the admin header changes to count only `pending + contact_submitted = true` (actionable pending), so admins aren't pinged for users who haven't filled the form yet.

## Database (one migration)

- Add `contact_submitted boolean NOT NULL DEFAULT false` to `public.hosts`.
- Update the host RLS update policy so a host can flip `contact_submitted` to true only when required fields (`full_name`, `phone`, `event_interest`) are non-empty; cannot flip it back to false (admin can, via service role / admin policy).
- Backfill existing approved hosts to `contact_submitted = true` so they aren't hidden retroactively.

## Server functions (`src/lib/kenangan.functions.ts`)

- `updateMyContactInfo`: extend to accept a `submit: boolean` flag. When `submit` is true, validate required fields with Zod (full_name 1–100, phone 5–30, company 0–100, event_interest 1–1000) and set `contact_submitted = true`.
- `getMyHost`: already returns the host row; add `contact_submitted` to the projection.
- `listHosts` (admin): add a `filter` param (`all` | `awaiting_contact` | `ready_for_review` | `approved` | `suspended`) and include `contact_submitted` in results. Default UI tab = "Ready for review".
- `adminUpdateHostContact`: unchanged behavior, just continues to work.
- Bell count query (`pendingCount`): change to `status = 'pending' AND contact_submitted = true`.

## UI changes

- `src/routes/_authenticated.dashboard.pending.tsx`:
  - Two states driven by `host.contact_submitted`:
    - **Not submitted**: headline "Tell us about your event", contact form, "Submit for approval" button (disabled until required fields valid).
    - **Submitted & still pending**: headline "Thanks — your request is with our team", read-only summary card, "Edit details" button that flips back to the form (keeps `contact_submitted = true`; admin already saw it, edits just update fields).
  - Remove the current "waiting for approval" copy from the not-submitted state.

- `src/routes/_authenticated.admin.index.tsx`:
  - Add a tab/segment switcher above the hosts table: **Ready for review** (default) · **Awaiting contact info** · **Approved** · **Suspended** · **All**.
  - "Ready for review" rows show full contact columns + Approve / Suspend / Edit Contact.
  - "Awaiting contact info" rows show only email + signup date, with a muted "Waiting on host to submit details" badge and no Approve action.

- `src/routes/_authenticated.admin.tsx`: bell badge query updated to the new actionable-pending count.

## Out of scope

- Email notifications (still deferred until a sender domain is set up).
- Per-admin assignment of who receives which signup.

## Files touched

- `supabase/migrations/<new>.sql` (created)
- `src/lib/kenangan.functions.ts`
- `src/routes/_authenticated.dashboard.pending.tsx`
- `src/routes/_authenticated.admin.index.tsx`
- `src/routes/_authenticated.admin.tsx`
- `src/integrations/supabase/types.ts` (regenerated after migration)
