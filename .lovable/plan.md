## Why the guest is hitting "row level security"

When a guest (or even you, while signed in as the host) opens `/event/<slug>` and submits their name, the browser calls the public server function `registerGuest`. That function uses an **anon** Supabase client and does three things in order:

1. `get_guest_by_token` RPC — exists, anon has EXECUTE. Fine.
2. `loadEventForGuestAction` — `SELECT` on `events` by slug, then a `count` on `guests` for the cap check.
3. `INSERT` into `guests`.

I checked the current database state and the most plausible cause of "row level security" coming back to the UI is step 2's cap check, not the insert:

- The recent security tightening removed every `SELECT` policy on `guests` for `anon`. With RLS on and no anon SELECT policy, the count query (`select id, count: exact, head: true`) is a SELECT against `guests` from `anon`. In Supabase that returns `count: 0` silently rather than raising — **but** any `select(...)` follow-up after a previous error in the same request chain surfaces as a generic "row level security" toast in the UI, which matches what you saw.
- The actual `INSERT` policy on `guests` for `anon` is correct (`is_active = true`) and both of your events have `is_active = t`, so the insert itself is not the blocker.

I want to confirm by reading the exact error before changing policies. Two-step plan:

### Step 1 — capture the real error (no DB change)

Add a server-side `console.error(err)` inside `registerGuest`'s `try` path and re-throw, so the failing call shows up in the server-function logs with the Postgres error code (`42501` = grant, `PGRST…` = policy, etc.). Then ask you to retry once and read the log.

### Step 2 — fix based on what we see

Whichever of these the log points at:

- **If `42501` / "permission denied for table guests"** → the count query is being denied at the GRANT level (not RLS). Add a narrow `SELECT` policy on `guests` for `anon` scoped to `session_token = current_setting('request.jwt.claim.session_token', true)` is overkill; simpler: drop the count from `loadEventForGuestAction` for the guests cap and instead expose a `SECURITY DEFINER` RPC `count_guests_for_event(p_slug)` that anon can call. This keeps `guests` un-readable to anon while still letting the cap check work.
- **If "new row violates RLS for table guests"** → the only way that fires is `events.is_active` being false at insert time. We'd add a clearer error message ("This event isn't open for guests yet") instead of the generic RLS toast.
- **If it's actually a storage policy** (signed URL generation for invitation/cover) → relax the anon SELECT predicate on `event-covers`/`event-invitations` from `is_active = true` to also allow the host viewing their own event.

### What stays untouched

- The `INSERT` policies on `guests` (already correct).
- The `events` SELECT policies.
- The admin / host policies on everything.

After Step 1 I'll come back with the exact log line and the targeted fix from Step 2 — no schema change happens until then.