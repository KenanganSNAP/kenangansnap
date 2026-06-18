## Goal
On `/auth`, when a new user chooses to sign up, show the **contact details form first** (step 1), then the **email/password account creation** (step 2). Sign-in flow stays unchanged.

## Flow

```text
Click "Host an event"
        ↓
   /auth (signin)
        ↓ "Create an account"
   Step 1 — Contact details
   • Full name (required)
   • Phone / WhatsApp (required)
   • Company / organization (optional)
   • Event interest (required, textarea)
        ↓ "Continue →"
   Step 2 — Account
   • Email (required)
   • Password (required, min 6)
        ↓ "Create account →"
   supabase.auth.signUp(email, password)
        ↓ session established
   updateMyContactInfo({ ...step1, submit: true })
        ↓
   Redirect to /dashboard → bounced to /dashboard/pending
   (shows read-only "Awaiting Approval" summary with Edit option)
```

## Changes

**`src/routes/auth.tsx`** (only file with UI changes)
- Add `signupStep` state (`"contact" | "account"`) — defaults to `"contact"` when `mode === "signup"`.
- Add state for `fullName`, `phone`, `company`, `eventInterest`.
- When `mode === "signin"`: render existing email/password form as-is.
- When `mode === "signup"` and `signupStep === "contact"`:
  - Render the contact form fields.
  - "Continue →" button validates required fields client-side, then sets `signupStep = "account"`.
  - Show a small step indicator ("Step 1 of 2 — Your details").
  - Hide the Google button on step 1 (Google sign-in needs a different flow since it skips email/password — see below).
- When `mode === "signup"` and `signupStep === "account"`:
  - Render email + password fields.
  - "Back" link returns to step 1 (preserves entered values).
  - On submit: call `supabase.auth.signUp`, then once the session exists call `updateMyContactInfo({ full_name, phone, company, event_interest, submit: true })`, then navigate to `/dashboard` (pending page takes over).
  - Step indicator: "Step 2 of 2 — Account".
- Toggling back to "Sign in" clears the signup state cleanly.

**Google OAuth on signup**
- Google users come back authenticated with no contact info yet. They'll land on `/dashboard/pending` and fill the existing form there — no change needed.
- Keep the Google button visible on the sign-in view and on signup step 2; hide on step 1 to avoid bypassing the contact step in the email/password flow.

## What does NOT change
- `updateMyContactInfo` server function (already accepts `submit: true` and validates required fields).
- `/dashboard/pending` page (still the fallback for Google signups and for edits).
- Admin tabs and notification counts (still keyed off `contact_submitted`).
- No database changes.

## Validation
- Client-side: required fields enforced before allowing "Continue →".
- Server-side: `updateMyContactInfo` already validates `full_name`, `phone`, `event_interest` when `submit: true`.

## Edge cases
- If `signUp` succeeds but `updateMyContactInfo` fails (network), user lands on `/dashboard/pending` and can submit from there — no data loss because the pending form re-collects the same fields.
- If user refreshes mid-signup, state resets — acceptable since no account yet exists.
