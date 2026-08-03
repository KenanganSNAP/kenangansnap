# Photo sharing consent

Ask each guest, right after they tap "Open Camera", whether other guests may download their photos.

## Flow

1. Guest types their name and taps "Open Camera" on the event page.
2. A modal appears before the camera opens:
   - Title: "Share your photos?"
   - Description: "Would you like other guests at this event to be able to view and download your photos from the gallery?"
   - Buttons: "Yes" (primary) / "No" (secondary)
3. The choice is stored with the guest session and applied to every photo they capture at that event.
4. Only after a choice is made does the app navigate to the camera.

## What each choice does

- Yes: photos save to the gallery, everyone sees them, download button visible.
- No: photos still save to the gallery and everyone still sees them, but the download button is hidden for those photos (grid tile and lightbox), with a small "Download disabled by guest" note in the lightbox.

The choice is per guest per event; re-entering the event on the same device keeps the earlier answer (they can change it by clearing the session — no separate settings screen in this scope).

## Technical notes

- Database: add `allow_download boolean not null default true` to `photos`. Extend the `submit_guest_photo` security-definer function with a `p_allow_download` parameter (defaulted to true so existing calls stay valid).
- `src/lib/guest-session.ts`: store `allowDownload` in the saved guest session.
- `src/routes/event.$slug.index.tsx`: after successful guest registration, show the consent modal instead of navigating immediately; navigate to `/event/$slug/capture` on either button.
- `src/lib/kenangan.functions.ts`: `uploadPhoto` accepts `allowDownload` and passes it to the RPC; `listAlbum` selects `allow_download` and returns it on each `PhotoItem`.
- `src/routes/event.$slug.capture.tsx`: pass the session's `allowDownload` when uploading.
- `src/routes/event.$slug.album.tsx`: hide the download control in the grid tile and lightbox when `allow_download` is false.
- Host/admin download and ZIP export are unchanged — the flag only affects the public guest gallery.
- New UI strings added to both EN and MS locale files.
