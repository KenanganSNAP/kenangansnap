## Goal

On mobile, the Capture screen currently stacks a header, a 3:4 camera box, template chips, filter chips and the shutter vertically, so the shutter falls below the fold and you must scroll to snap. Rebuild Capture as a full-screen camera view (like the third reference image, minus Boomerang).

## What changes (Capture screen only)

1. **Full-bleed camera**
   - The live video fills the entire viewport (`100dvh`, safe-area aware), object-cover, no page scrolling on this screen.
   - Event title / guest chip float as a subtle overlay at the top; back arrow on the top-left; flip-camera button near the shutter.

2. **Overlay controls, nothing below the fold**
   - Filter row: horizontally scrollable thumbnail tiles floating over the camera (labels under each tile, active one ringed) — same look as the reference.
   - Template row: kept, as a second compact scrollable row above the filters (chips with thumbnails), since templates already exist in this app.
   - Shutter: large circular button centred at the bottom, always visible, with the flip button to its right and a small "album" thumbnail shortcut to its left.
   - A "View album" pill below the shutter, matching the reference.

3. **Bottom nav on this screen**
   - The fixed bottom nav currently overlaps the camera controls. On Capture it will be hidden (the overlay provides Home/back and Album shortcuts); it stays unchanged on Home, Album, Notes and Voice.

4. **Preview / after-snap state**
   - After snapping, the captured photo fills the same full-screen frame with overlaid actions: Retake, Send to album, plus the existing Print buttons when enabled.
   - Template switching after capture stays available as the same floating row.

5. **No behaviour changes**
   - Capture, filter, template compositing, upload, print, and limits logic stay exactly as they are today. This is a layout/presentation change.

## Technical notes

- Rework only `src/routes/event.$slug.capture.tsx` plus a small conditional in `src/routes/event.$slug.tsx` to skip `BottomNav` and the floating header controls on `/event/$slug/capture`.
- Use `h-[100dvh]`, `fixed inset-0`, `overflow-hidden`, and `env(safe-area-inset-*)` padding so Android/iOS browser chrome does not push controls off screen.
- Keep all colours on existing semantic tokens; overlay surfaces use translucent ink/cream so it works in both light and dark themes.
- No Boomerang mode.
