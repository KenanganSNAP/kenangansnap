# Fix ambiguous photo submission function

Photo submission fails on some events because the database has two versions of the same photo-saving routine: an older one without the download-permission flag and the newer one with it. When the app omits optional values, the database can't tell which version to run and rejects the request.

## Changes

1. Remove the outdated photo-saving routine (the one without the download-permission flag). Only the newer version remains.
2. Make the app always send every value explicitly — including empty ones for filter, original image, and template — so the call can never be ambiguous again.
3. Confirm the other guest submission routines (notes, voice, guest registration) have no duplicates. Verified: each exists exactly once today, so no changes needed there.
4. Verify by submitting a photo on an existing event and on a freshly created event.

## Technical notes

- Migration: `DROP FUNCTION public.submit_guest_photo(text, uuid, text, text, text, text, uuid);` keeping the 8-arg overload with `p_allow_download boolean DEFAULT true`.
- `src/lib/kenangan.functions.ts` (`uploadPhoto`): replace `?? undefined` with `?? null` for `p_original_url` and `p_template_id` — `undefined` is stripped from the JSON body, which drops the argument and reintroduces overload ambiguity. `p_filter_applied` is also sent as `null` when empty.
- Current DB state confirmed: `submit_guest_note`, `submit_guest_voice`, `register_guest`, `get_guest_by_token` each have a single signature.
- Post-fix check: run a guest photo submission against an existing event slug and a newly created event, confirming a row lands in `photos` with the correct `allow_download` value.
