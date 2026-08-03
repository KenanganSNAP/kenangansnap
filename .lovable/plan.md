## Bug: blank camera after Retake

On the Capture screen the `<video>` element is only rendered when there is no preview. Taking a photo unmounts it; pressing Retake mounts a brand-new `<video>` with no `srcObject`. The camera stream is still running, but nothing is attached to the new element, and the effect that attaches it only re-runs when the front/back camera changes — so you get an empty frame.

## Fix

1. Keep the `<video>` element mounted at all times in `src/routes/event.$slug.capture.tsx`; hide it behind the captured photo instead of removing it from the DOM (the preview image stays layered on top while a shot is being reviewed).
2. Re-attach and replay the existing stream whenever the preview is cleared, as a safety net (set `srcObject` from the stored stream ref and call `play()` if the video is paused).
3. Also re-attach if the browser suspended the track when the page was backgrounded, so returning to the camera always shows a live feed.

No changes to capture, filters, templates, upload, or print logic — layout and stream-attachment only.
