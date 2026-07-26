## Problem

The `register_guest` Postgres RPC (added in `supabase/migrations/20260620135432_*.sql`) falls back to `encode(gen_random_bytes(32), 'hex')` when no session token is passed. `gen_random_bytes` lives in the `pgcrypto` extension, which isn't enabled on this project, so the call throws `function gen_random_bytes(integer) does not exist` and blocks any guest from entering the event after tapping "Open Camera".

## Fix

Ship one new migration that replaces the `register_guest` function so its token fallback no longer depends on `pgcrypto`. Use `gen_random_uuid()::text` (already available via pgcrypto/pgsql defaults used elsewhere in the schema, e.g. `gen_random_uuid()` in table defaults) — no extension change needed.

Change inside the function body:

```sql
v_token := COALESCE(NULLIF(p_token, ''), replace(gen_random_uuid()::text, '-', ''));
```

Everything else in the function (capacity checks, upsert-by-token, insert path) stays identical. Keep the same `SECURITY DEFINER`, `search_path`, and grants.

In practice the client always passes a `sessionToken` from `newSessionToken()`, so this fallback is rarely hit — but it must not error when it is.

## Verification

1. From the guest URL (`/event/<slug>`), enter a name and tap "Open Camera" — registration succeeds and the camera page loads.
2. Re-enter with the same browser (same stored token) — no duplicate row, same `guestId` returned (idempotency preserved).
3. No other code changes; guest/host/admin flows are untouched.