import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

// PUBLIC: Get event by slug (anon)
export const getEventBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: event, error } = await sb
      .from("events")
      .select("id, slug, title, event_type, date, venue, welcome_message, cover_image_url, invitation_image_url, reveal_at, is_active")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) return null;
    // Sign cover + invitation if present
    let coverUrl: string | null = null;
    let inviteUrl: string | null = null;
    if (event.cover_image_url) {
      const { data: s } = await sb.storage.from("event-covers").createSignedUrl(event.cover_image_url, 60 * 60);
      coverUrl = s?.signedUrl ?? null;
    }
    if (event.invitation_image_url) {
      const { data: s } = await sb.storage.from("event-invitations").createSignedUrl(event.invitation_image_url, 60 * 60);
      inviteUrl = s?.signedUrl ?? null;
    }
    return { ...event, cover_signed_url: coverUrl, invitation_signed_url: inviteUrl };
  });

// PUBLIC: Register guest
export const registerGuest = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; name: string; sessionToken: string }) =>
    z.object({
      slug: z.string().min(1),
      name: z.string().min(1).max(60),
      sessionToken: z.string().min(8),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: event, error: eErr } = await sb
      .from("events").select("id, is_active").eq("slug", data.slug).maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!event || !event.is_active) throw new Error("Event not available");

    // Idempotent upsert via unique (event_id, session_token)
    const { data: existing } = await sb.from("guests")
      .select("id, name").eq("event_id", event.id).eq("session_token", data.sessionToken).maybeSingle();
    if (existing) return { guestId: existing.id, name: existing.name };

    const { data: inserted, error } = await sb.from("guests")
      .insert({ event_id: event.id, name: data.name, session_token: data.sessionToken })
      .select("id, name").single();
    if (error) throw new Error(error.message);
    return { guestId: inserted.id, name: inserted.name };
  });

// PUBLIC: Upload photo (data URL base64 from canvas)
export const uploadPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; guestId: string; guestName: string; filter: string; dataUrl: string; originalDataUrl?: string | null; templateId?: string | null }) =>
    z.object({
      slug: z.string().min(1),
      guestId: z.string().uuid(),
      guestName: z.string().min(1).max(60),
      filter: z.string().max(20),
      dataUrl: z.string().startsWith("data:image/").max(20_000_000),
      originalDataUrl: z.string().startsWith("data:image/").max(20_000_000).nullable().optional(),
      templateId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: event, error: eErr } = await sb.from("events")
      .select("id, is_active").eq("slug", data.slug).maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!event || !event.is_active) throw new Error("Event not available");

    async function uploadDataUrl(dataUrl: string) {
      const [meta, b64] = dataUrl.split(",");
      const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
      const ext = mime.includes("png") ? "png" : "jpg";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `${event!.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("photos").upload(path, bytes, { contentType: mime, upsert: false });
      if (error) throw new Error(error.message);
      return path;
    }

    const path = await uploadDataUrl(data.dataUrl);
    let originalPath: string | null = null;
    if (data.originalDataUrl) originalPath = await uploadDataUrl(data.originalDataUrl);

    const { error: insErr, data: row } = await sb.from("photos").insert({
      event_id: event.id,
      guest_id: data.guestId,
      guest_name: data.guestName,
      storage_url: path,
      media_type: "photo",
      filter_applied: data.filter,
      original_url: originalPath,
      template_id: data.templateId ?? null,
    }).select("id").single();
    if (insErr) throw new Error(insErr.message);
    return { id: row.id };
  });

// PUBLIC: Upload voice
export const uploadVoice = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; guestId: string; guestName: string; dataUrl: string }) =>
    z.object({
      slug: z.string().min(1),
      guestId: z.string().uuid(),
      guestName: z.string().min(1).max(60),
      dataUrl: z.string().startsWith("data:").max(20_000_000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: event, error: eErr } = await sb.from("events")
      .select("id, is_active").eq("slug", data.slug).maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!event || !event.is_active) throw new Error("Event not available");

    const [meta, b64] = data.dataUrl.split(",");
    const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "audio/webm";
    const ext = mime.includes("mp4") ? "m4a" : "webm";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${event.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await sb.storage.from("audio-memories").upload(path, bytes, {
      contentType: mime, upsert: false,
    });
    if (upErr) throw new Error(upErr.message);

    const { error, data: row } = await sb.from("memories").insert({
      event_id: event.id,
      guest_id: data.guestId,
      guest_name: data.guestName,
      type: "voice",
      audio_url: path,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// PUBLIC: Submit note
export const submitNote = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; guestId: string; guestName: string; content: string }) =>
    z.object({
      slug: z.string().min(1),
      guestId: z.string().uuid(),
      guestName: z.string().min(1).max(60),
      content: z.string().min(1).max(500),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: event } = await sb.from("events").select("id, is_active").eq("slug", data.slug).maybeSingle();
    if (!event || !event.is_active) throw new Error("Event not available");
    const { error, data: row } = await sb.from("memories").insert({
      event_id: event.id,
      guest_id: data.guestId,
      guest_name: data.guestName,
      type: "note",
      content: data.content,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

// PUBLIC: List album (enforces reveal time + signed URLs)
export const listAlbum = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: event } = await sb.from("events")
      .select("id, is_active, reveal_at").eq("slug", data.slug).maybeSingle();
    if (!event || !event.is_active) return { revealed: false, revealAt: null, items: [] as PhotoItem[] };
    const revealed = !event.reveal_at || new Date(event.reveal_at) <= new Date();
    if (!revealed) return { revealed: false, revealAt: event.reveal_at, items: [] };

    const { data: rows, error } = await sb.from("photos")
      .select("id, guest_name, storage_url, filter_applied, created_at")
      .eq("event_id", event.id).order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);

    const items: PhotoItem[] = await Promise.all((rows ?? []).map(async (r) => {
      const { data: s } = await sb.storage.from("photos").createSignedUrl(r.storage_url, 60 * 60);
      return { ...r, signed_url: s?.signedUrl ?? "" };
    }));
    return { revealed: true, revealAt: event.reveal_at, items };
  });

export type PhotoItem = {
  id: string;
  guest_name: string;
  storage_url: string;
  filter_applied: string | null;
  created_at: string;
  signed_url: string;
};

// PUBLIC: List notes + voice
export const listMemories = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: event } = await sb.from("events")
      .select("id, is_active, reveal_at").eq("slug", data.slug).maybeSingle();
    if (!event || !event.is_active) return { revealed: false, notes: [], voices: [] };
    const revealed = !event.reveal_at || new Date(event.reveal_at) <= new Date();
    if (!revealed) return { revealed: false, notes: [], voices: [] };

    const { data: rows, error } = await sb.from("memories")
      .select("id, guest_name, type, content, audio_url, created_at")
      .eq("event_id", event.id).order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);

    const notes = (rows ?? []).filter((r) => r.type === "note").map((r) => ({
      id: r.id, guest_name: r.guest_name, content: r.content ?? "", created_at: r.created_at,
    }));
    const voicesRaw = (rows ?? []).filter((r) => r.type === "voice");
    const voices = await Promise.all(voicesRaw.map(async (r) => {
      const { data: s } = r.audio_url
        ? await sb.storage.from("audio-memories").createSignedUrl(r.audio_url, 60 * 60)
        : { data: null };
      return { id: r.id, guest_name: r.guest_name, audio_url: r.audio_url ?? "", signed_url: s?.signedUrl ?? "", created_at: r.created_at };
    }));
    return { revealed: true, notes, voices };
  });

// AUTHED: My events
export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("events").select("id, slug, title, event_type, date, venue, is_active, created_at")
      .eq("host_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // counts
    const ids = (data ?? []).map((e) => e.id);
    const counts: Record<string, { guests: number; photos: number; notes: number; voices: number }> = {};
    for (const id of ids) counts[id] = { guests: 0, photos: 0, notes: 0, voices: 0 };
    if (ids.length) {
      const [g, p, m] = await Promise.all([
        context.supabase.from("guests").select("event_id", { count: "exact", head: false }).in("event_id", ids),
        context.supabase.from("photos").select("event_id", { count: "exact", head: false }).in("event_id", ids),
        context.supabase.from("memories").select("event_id, type").in("event_id", ids),
      ]);
      g.data?.forEach((r) => counts[r.event_id].guests++);
      p.data?.forEach((r) => counts[r.event_id].photos++);
      m.data?.forEach((r) => { if (r.type === "note") counts[r.event_id].notes++; else counts[r.event_id].voices++; });
    }

    return (data ?? []).map((e) => ({ ...e, counts: counts[e.id] }));
  });

// AUTHED: my host status
export const getMyHostStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: host }, { data: roles }] = await Promise.all([
      context.supabase.from("hosts").select("status, email").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    return {
      status: host?.status ?? "pending",
      email: host?.email ?? null,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  });

// AUTHED: Create event
export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    title: string; slug: string; eventType: string; date: string | null;
    venue: string | null; welcomeMessage: string | null; revealAt: string | null;
    coverDataUrl: string | null; invitationDataUrl: string | null;
    customData?: Record<string, string> | null;
  }) => z.object({
    title: z.string().min(1).max(120),
    slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
    eventType: z.enum(["wedding", "birthday", "party", "travel", "ceremony"]),
    date: z.string().nullable(),
    venue: z.string().max(200).nullable(),
    welcomeMessage: z.string().max(500).nullable(),
    revealAt: z.string().nullable(),
    coverDataUrl: z.string().nullable(),
    invitationDataUrl: z.string().nullable(),
    customData: z.record(z.string(), z.string().max(2000)).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: event, error } = await context.supabase.from("events").insert({
      host_id: context.userId,
      slug: data.slug,
      title: data.title,
      event_type: data.eventType,
      date: data.date,
      venue: data.venue,
      welcome_message: data.welcomeMessage,
      reveal_at: data.revealAt,
      is_active: true,
      custom_data: (data.customData ?? {}) as never,
    }).select("id, slug").single();
    if (error) throw new Error(error.message);

    const updates: { cover_image_url?: string; invitation_image_url?: string } = {};
    if (data.coverDataUrl) updates.cover_image_url = await uploadDataUrl(context.supabase, "event-covers", event.id, data.coverDataUrl);
    if (data.invitationDataUrl) updates.invitation_image_url = await uploadDataUrl(context.supabase, "event-invitations", event.id, data.invitationDataUrl);
    if (Object.keys(updates).length) {
      await context.supabase.from("events").update(updates).eq("id", event.id);
    }
    return event;
  });

async function uploadDataUrl(
  sb: { storage: { from: (b: string) => { upload: (p: string, body: Uint8Array, opts: { contentType: string; upsert: boolean }) => Promise<{ error: { message: string } | null }> } } },
  bucket: string,
  eventId: string,
  dataUrl: string,
) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(bucket).upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

// AUTHED: Get event detail for host (with signed URLs, full media list)
export const getEventForHost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: event, error } = await context.supabase
      .from("events").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) throw new Error("Not found");

    const [guestRes, photoRes, memRes] = await Promise.all([
      context.supabase.from("guests").select("id, name, created_at").eq("event_id", event.id).order("created_at", { ascending: false }),
      context.supabase.from("photos").select("id, guest_name, storage_url, filter_applied, created_at").eq("event_id", event.id).order("created_at", { ascending: false }),
      context.supabase.from("memories").select("id, guest_name, type, content, audio_url, created_at").eq("event_id", event.id).order("created_at", { ascending: false }),
    ]);
    if (guestRes.error) throw new Error(guestRes.error.message);
    if (photoRes.error) throw new Error(photoRes.error.message);
    if (memRes.error) throw new Error(memRes.error.message);

    let coverUrl: string | null = null;
    let inviteUrl: string | null = null;
    if (event.cover_image_url) {
      const { data: s } = await context.supabase.storage.from("event-covers").createSignedUrl(event.cover_image_url, 60 * 60);
      coverUrl = s?.signedUrl ?? null;
    }
    if (event.invitation_image_url) {
      const { data: s } = await context.supabase.storage.from("event-invitations").createSignedUrl(event.invitation_image_url, 60 * 60);
      inviteUrl = s?.signedUrl ?? null;
    }
    const photos = await Promise.all((photoRes.data ?? []).map(async (p) => {
      const { data: s } = await context.supabase.storage.from("photos").createSignedUrl(p.storage_url, 60 * 60);
      return { ...p, signed_url: s?.signedUrl ?? "" };
    }));
    const voices = await Promise.all((memRes.data ?? []).filter((m) => m.type === "voice").map(async (m) => {
      const { data: s } = m.audio_url
        ? await context.supabase.storage.from("audio-memories").createSignedUrl(m.audio_url, 60 * 60)
        : { data: null };
      return { id: m.id, guest_name: m.guest_name, audio_url: m.audio_url, signed_url: s?.signedUrl ?? "", created_at: m.created_at };
    }));
    const notes = (memRes.data ?? []).filter((m) => m.type === "note").map((m) => ({
      id: m.id, guest_name: m.guest_name, content: m.content ?? "", created_at: m.created_at,
    }));

    return {
      event: { ...event, cover_signed_url: coverUrl, invitation_signed_url: inviteUrl },
      guests: guestRes.data ?? [],
      photos, notes, voices,
    };
  });

export const toggleEventActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; isActive: boolean }) =>
    z.object({ id: z.string().uuid(), isActive: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").update({ is_active: data.isActive }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateEventInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; dataUrl: string }) =>
    z.object({ id: z.string().uuid(), dataUrl: z.string().startsWith("data:image/").max(20_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const path = await uploadDataUrl(context.supabase, "event-invitations", data.id, data.dataUrl);
    const { error } = await context.supabase.from("events").update({ invitation_image_url: path }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("photos").select("storage_url").eq("id", data.id).maybeSingle();
    if (row?.storage_url) await context.supabase.storage.from("photos").remove([row.storage_url]);
    const { error } = await context.supabase.from("photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("memories").select("audio_url").eq("id", data.id).maybeSingle();
    if (row?.audio_url) await context.supabase.storage.from("audio-memories").remove([row.audio_url]);
    const { error } = await context.supabase.from("memories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ADMIN
async function requireAdmin(context: { supabase: ReturnType<typeof publicClient>; userId: string }) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const listHosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase.from("hosts")
      .select("user_id, email, status, created_at").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setHostStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; status: "pending" | "approved" | "suspended" }) =>
    z.object({ userId: z.string().uuid(), status: z.enum(["pending", "approved", "suspended"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("hosts").update({ status: data.status }).eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data: events, error } = await context.supabase.from("events")
      .select("id, slug, title, event_type, date, venue, is_active, host_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: hosts } = await context.supabase.from("hosts").select("user_id, email");
    const hostMap = new Map((hosts ?? []).map((h) => [h.user_id, h.email]));
    return (events ?? []).map((e) => ({ ...e, host_email: hostMap.get(e.host_id) ?? null }));
  });

export const listAllGuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase.from("guests")
      .select("id, name, created_at, event_id, events(title, slug)")
      .order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ADMIN: list guests for a single event
export const listEventGuestsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const [guestsRes, photosRes] = await Promise.all([
      context.supabase.from("guests")
        .select("id, name, created_at").eq("event_id", data.eventId)
        .order("created_at", { ascending: false }),
      context.supabase.from("photos")
        .select("guest_id").eq("event_id", data.eventId),
    ]);
    if (guestsRes.error) throw new Error(guestsRes.error.message);
    const counts = new Map<string, number>();
    for (const p of photosRes.data ?? []) {
      if (p.guest_id) counts.set(p.guest_id, (counts.get(p.guest_id) ?? 0) + 1);
    }
    return (guestsRes.data ?? []).map((g) => ({ ...g, photo_count: counts.get(g.id) ?? 0 }));
  });

// ADMIN: rename guest (audited)
export const adminUpdateGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { guestId: string; name: string }) =>
    z.object({ guestId: z.string().uuid(), name: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: before, error: bErr } = await context.supabase.from("guests")
      .select("id, name, event_id").eq("id", data.guestId).maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!before) throw new Error("Guest not found");
    const newName = data.name.trim();
    if (newName === before.name) return { ok: true, changed: 0 };
    const { error } = await context.supabase.from("guests")
      .update({ name: newName }).eq("id", data.guestId);
    if (error) throw new Error(error.message);
    await context.supabase.from("event_audits").insert({
      event_id: before.event_id,
      entity_type: "guest",
      entity_id: before.id,
      edited_by: context.userId,
      changed_fields: { name: { from: before.name, to: newName } } as unknown as import("@/integrations/supabase/types").Json,
      note: "Guest renamed by Admin",
    });
    return { ok: true, changed: 1 };
  });


// ADMIN: list all media across events (signed URLs)
export const listAllMedia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const [photoRes, memRes, evRes] = await Promise.all([
      context.supabase.from("photos").select("id, guest_name, storage_url, event_id, created_at").order("created_at", { ascending: false }).limit(300),
      context.supabase.from("memories").select("id, guest_name, type, content, audio_url, event_id, created_at").order("created_at", { ascending: false }).limit(300),
      context.supabase.from("events").select("id, title, slug"),
    ]);
    const evMap = new Map((evRes.data ?? []).map((e) => [e.id, e]));
    const photos = await Promise.all((photoRes.data ?? []).map(async (p) => {
      const { data: s } = await context.supabase.storage.from("photos").createSignedUrl(p.storage_url, 60 * 60);
      return { ...p, signed_url: s?.signedUrl ?? "", event: evMap.get(p.event_id) ?? null };
    }));
    const voices = await Promise.all((memRes.data ?? []).filter((m) => m.type === "voice").map(async (m) => {
      const { data: s } = m.audio_url ? await context.supabase.storage.from("audio-memories").createSignedUrl(m.audio_url, 60 * 60) : { data: null };
      return { id: m.id, guest_name: m.guest_name, signed_url: s?.signedUrl ?? "", created_at: m.created_at, event: evMap.get(m.event_id) ?? null };
    }));
    const notes = (memRes.data ?? []).filter((m) => m.type === "note").map((m) => ({
      id: m.id, guest_name: m.guest_name, content: m.content ?? "", created_at: m.created_at, event: evMap.get(m.event_id) ?? null,
    }));
    return { photos, voices, notes };
  });

// ADMIN: delete any photo / memory
export const adminDeletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row } = await context.supabase.from("photos").select("storage_url").eq("id", data.id).maybeSingle();
    if (row?.storage_url) await context.supabase.storage.from("photos").remove([row.storage_url]);
    const { error } = await context.supabase.from("photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row } = await context.supabase.from("memories").select("audio_url").eq("id", data.id).maybeSingle();
    if (row?.audio_url) await context.supabase.storage.from("audio-memories").remove([row.audio_url]);
    const { error } = await context.supabase.from("memories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ADMIN: grant/revoke admin role, list admins
export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data: roles, error } = await context.supabase
      .from("user_roles").select("user_id").eq("role", "admin");
    if (error) throw new Error(error.message);
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const map = new Map((usersData?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return ids.map((id) => ({ user_id: id, email: map.get(id) ?? "" }));
  });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string }) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = data.email.toLowerCase().trim();
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const user = (usersData?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === target);
    if (!user) throw new Error("No user with that email. Ask them to sign up first.");
    const { error } = await supabaseAdmin.from("user_roles")
      .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.userId === context.userId) throw new Error("You cannot revoke your own admin access.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_roles")
      .delete().eq("user_id", data.userId).eq("role", "admin");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ADMIN: delete event / guest
export const adminDeleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    // Best-effort cleanup of storage files for this event before cascade delete
    const [{ data: photos }, { data: mems }, { data: ev }] = await Promise.all([
      context.supabase.from("photos").select("storage_url").eq("event_id", data.eventId),
      context.supabase.from("memories").select("audio_url").eq("event_id", data.eventId),
      context.supabase.from("events").select("cover_image_url, invitation_image_url").eq("id", data.eventId).maybeSingle(),
    ]);
    const photoPaths = (photos ?? []).map((p) => p.storage_url).filter(Boolean) as string[];
    const audioPaths = (mems ?? []).map((m) => m.audio_url).filter(Boolean) as string[];
    if (photoPaths.length) await context.supabase.storage.from("photos").remove(photoPaths);
    if (audioPaths.length) await context.supabase.storage.from("audio-memories").remove(audioPaths);
    if (ev?.cover_image_url) await context.supabase.storage.from("event-covers").remove([ev.cover_image_url]);
    if (ev?.invitation_image_url) await context.supabase.storage.from("event-invitations").remove([ev.invitation_image_url]);
    const { error } = await context.supabase.from("events").delete().eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteGuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { guestId: string }) => z.object({ guestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: before } = await context.supabase.from("guests")
      .select("id, name, event_id").eq("id", data.guestId).maybeSingle();
    const { error } = await context.supabase.from("guests").delete().eq("id", data.guestId);
    if (error) throw new Error(error.message);
    if (before) {
      await context.supabase.from("event_audits").insert({
        event_id: before.event_id,
        entity_type: "guest",
        entity_id: before.id,
        edited_by: context.userId,
        changed_fields: { name: { from: before.name, to: null } } as unknown as import("@/integrations/supabase/types").Json,
        note: "Guest deleted by Admin",
      });
    }
    return { ok: true };
  });


// HOMEPAGE settings
export type HomepageSettings = {
  hero_eyebrow: string;
  hero_title_line1: string;
  hero_title_line2: string;
  hero_subtitle: string;
  cta_primary: string;
  cta_secondary: string;
  section_title: string;
  section_subtitle: string;
  features: { title: string; body: string }[];
  footer_note: string;
};

const homepageDefaults: HomepageSettings = {
  hero_eyebrow: "A live memory booth",
  hero_title_line1: "Every guest.",
  hero_title_line2: "Every memory.",
  hero_subtitle: "One QR code at the door. Your guests send photos, voice notes, and heartfelt messages straight to your private album — no app, no sign-ups.",
  cta_primary: "Start your event",
  cta_secondary: "See how it works",
  section_title: "A booth without a booth",
  section_subtitle: "Four ways your guests can leave something behind — gathered into one elegant private album.",
  features: [
    { title: "One QR", body: "Print it, frame it, project it. Guests scan and they're in." },
    { title: "Film photos", body: "Live camera with five tactile film filters — warm, fade, noir, golden, cinematic." },
    { title: "Voice notes", body: "Hold-to-record up to 60 seconds. The voice you remember, kept forever." },
    { title: "Written wishes", body: "A small page for the long messages — doa, jokes, secrets." },
  ],
  footer_note: "Crafted with care",
};

export const getHomepageSettings = createServerFn({ method: "GET" })
  .handler(async (): Promise<HomepageSettings> => {
    const sb = publicClient();
    const { data } = await sb.from("site_settings").select("settings").eq("key", "homepage").maybeSingle();
    const merged = { ...homepageDefaults, ...(data?.settings as Partial<HomepageSettings> ?? {}) };
    return merged;
  });

export const updateHomepageSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { settings: HomepageSettings }) => z.object({
    settings: z.object({
      hero_eyebrow: z.string().max(120),
      hero_title_line1: z.string().max(120),
      hero_title_line2: z.string().max(120),
      hero_subtitle: z.string().max(600),
      cta_primary: z.string().max(60),
      cta_secondary: z.string().max(60),
      section_title: z.string().max(120),
      section_subtitle: z.string().max(400),
      features: z.array(z.object({ title: z.string().max(60), body: z.string().max(300) })).length(4),
      footer_note: z.string().max(200),
    }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("site_settings")
      .upsert({ key: "homepage", settings: data.settings, updated_at: new Date().toISOString(), updated_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
