# Fix Studio control → Events: Edit & View buttons

## Root cause (Edit button)

In TanStack file-based routing, when a route file has children, it acts as
a **layout** for them. The layout's component MUST render `<Outlet />`,
otherwise child routes match the URL but nothing appears on screen.

Current files:
- `src/routes/_authenticated.admin.events.tsx` — renders the events table directly (no `<Outlet />`)
- `src/routes/_authenticated.admin.events.$id.tsx` — child route

So clicking **Edit** navigates to `/admin/events/$id`, the parent matches,
but because the parent component renders a table instead of `<Outlet />`,
the edit page never mounts. The URL changes but the visible UI stays on
the list (looks like nothing happened).

## Root cause (View button)

The **View** link goes to `/event/$slug` — the guest-facing landing page
that asks "What's your name?" before opening the camera. For an admin
clicking from Studio control, this is the wrong destination: it isn't
"viewing" the event, it's joining as a guest. They likely expect a
preview of the live guest page without the registration gate, or to be
sent to the host dashboard view of the event.

## Plan

### 1. Make the events list a true index route (fixes Edit)

- Rename `src/routes/_authenticated.admin.events.tsx` → `src/routes/_authenticated.admin.events.index.tsx` (no other changes — same component, still renders the table at `/admin/events`).
- Create a new `src/routes/_authenticated.admin.events.tsx` containing just a layout that returns `<Outlet />`:
  ```tsx
  import { createFileRoute, Outlet } from "@tanstack/react-router";
  export const Route = createFileRoute("/_authenticated/admin/events")({
    component: () => <Outlet />,
  });
  ```
- The route tree regenerates on save; `/admin/events` continues to render the table, and `/admin/events/$id` now mounts the edit page inside the layout.

### 2. Fix the View button destination

Change the **View** link on the admin events list (and keep parity on
the global admin pages if relevant) to open the event's guest landing
page in a **new tab**, bypassing the "join as guest" expectation by
making it clearly external/preview-style:

```tsx
<a href={`/event/${e.slug}`} target="_blank" rel="noopener noreferrer"
   className="text-ink underline">View</a>
```

This keeps the existing public route (no extra code needed) but makes it
obvious it's a preview of the public guest experience, not in-app
navigation. The admin's edit view stays in-app via the Edit button.

(If you'd prefer View to instead deep-link to the host dashboard
`/dashboard/event/$id`, say the word and I'll wire that instead — but
admins aren't necessarily the host, so RLS on `getEventForHost` would
reject them, making the public guest page the safer "View".)

## Files touched

- `src/routes/_authenticated.admin.events.tsx` — replaced with `<Outlet />` layout
- `src/routes/_authenticated.admin.events.index.tsx` — new file, holds the existing list UI
- View link updated to `target="_blank"` on the events list

## Out of scope

- No DB / RLS changes (admin already has the needed policies).
- No changes to the audit log, guests tab, or other admin pages.
