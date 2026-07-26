## Plan

1. **Fix the guest write path for photos, notes, and voice**
   - Add database-backed guest submission functions for:
     - sending a photo to the album
     - sending a written wish
     - uploading a voice memory
   - These will follow the same safer pattern already used for guest registration.

2. **Validate every guest submission before saving**
   - Confirm the event exists and is currently `active`.
   - Confirm the guest ID belongs to that event.
   - Enforce the admin-set limits for photos, notes, and voice messages.
   - Reject invalid or mismatched guest names, event slugs, photo paths, audio paths, and note content.

3. **Remove the fragile direct table inserts from the public guest flow**
   - Update the app functions so `Send to album`, `Send wish`, and voice upload call the new validated backend/database functions instead of inserting directly into `photos` or `memories`.
   - Keep the existing guest pages and UI unchanged.

4. **Align access rules with the newer event status system**
   - Update the relevant photo/audio storage and guest-submission rules to use `status = active` consistently, instead of relying on the older `is_active` field.
   - This prevents future mismatches when admin changes event status.

5. **Verify the full guest flow**
   - Re-test: scan/open event link → enter guest name → open camera → take picture → send to album.
   - Re-test: Notes → type wish → send.
   - Re-test: Voice → record → stop/upload.
   - Confirm rows are saved and no row-level security errors appear.

## About connecting your own backend account

This project is already running on Lovable Cloud, which provides the database, auth, storage, and server functions for the app. You do not need to connect a separate external backend account to fix this issue. If you want to migrate the project to a separate external account later, we should treat that as a separate migration task after the guest upload bugs are fixed.