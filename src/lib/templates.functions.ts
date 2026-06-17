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

async function requireAdmin(context: { supabase: ReturnType<typeof publicClient>; userId: string }) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

function signPath(sb: ReturnType<typeof publicClient>, path: string | null) {
  if (!path) return Promise.resolve<string | null>(null);
  return sb.storage.from("site-assets").createSignedUrl(path, 60 * 60).then(({ data }) => data?.signedUrl ?? null);
}

export type TemplateKind = "frame" | "overlay";
export type TemplateRow = {
  id: string;
  name: string;
  kind: TemplateKind;
  preview_url: string | null;
  asset_url: string | null;
  is_active: boolean;
  sort_order: number;
};

async function rowsToTemplates(sb: ReturnType<typeof publicClient>, rows: { id: string; name: string; kind: string; preview_path: string | null; asset_path: string; is_active: boolean; sort_order: number }[]): Promise<TemplateRow[]> {
  return Promise.all(rows.map(async (r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind as TemplateKind,
    preview_url: await signPath(sb, r.preview_path),
    asset_url: await signPath(sb, r.asset_path),
    is_active: r.is_active,
    sort_order: r.sort_order,
  })));
}

// ===== ADMIN catalog =====
export const listAllTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data, error } = await context.supabase.from("photo_templates")
      .select("id, name, kind, preview_path, asset_path, is_active, sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return rowsToTemplates(context.supabase as unknown as ReturnType<typeof publicClient>, data ?? []);
  });

export const upsertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string | null; name: string; kind: TemplateKind; assetDataUrl: string | null; previewDataUrl: string | null; isActive: boolean }) =>
    z.object({
      id: z.string().uuid().nullable(),
      name: z.string().min(1).max(80),
      kind: z.enum(["frame", "overlay"]),
      assetDataUrl: z.string().startsWith("data:image/").max(8_000_000).nullable(),
      previewDataUrl: z.string().startsWith("data:image/").max(4_000_000).nullable(),
      isActive: z.boolean(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);

    async function upload(dataUrl: string, folder: string) {
      const [meta, b64] = dataUrl.split(",");
      const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/png";
      const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await context.supabase.storage.from("site-assets").upload(path, bytes, { contentType: mime, upsert: false });
      if (error) throw new Error(error.message);
      return path;
    }

    let assetPath: string | null = null;
    let previewPath: string | null = null;
    if (data.assetDataUrl) assetPath = await upload(data.assetDataUrl, "templates/assets");
    if (data.previewDataUrl) previewPath = await upload(data.previewDataUrl, "templates/previews");

    if (data.id) {
      const update: { name: string; kind: TemplateKind; is_active: boolean; updated_at: string; asset_path?: string; preview_path?: string } = {
        name: data.name, kind: data.kind, is_active: data.isActive,
        updated_at: new Date().toISOString(),
      };
      if (assetPath) update.asset_path = assetPath;
      if (previewPath) update.preview_path = previewPath;
      const { error } = await context.supabase.from("photo_templates").update(update).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    if (!assetPath) throw new Error("Asset image required");
    const { data: maxRow } = await context.supabase.from("photo_templates").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const sort_order = (maxRow?.sort_order ?? 0) + 1;
    const { data: ins, error } = await context.supabase.from("photo_templates").insert({
      name: data.name, kind: data.kind, asset_path: assetPath, preview_path: previewPath,
      is_active: data.isActive, sort_order, created_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row } = await context.supabase.from("photo_templates").select("asset_path, preview_path").eq("id", data.id).maybeSingle();
    if (row) {
      const paths = [row.asset_path, row.preview_path].filter((p): p is string => !!p);
      if (paths.length) await context.supabase.storage.from("site-assets").remove(paths);
    }
    const { error } = await context.supabase.from("photo_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; direction: "up" | "down" }) =>
    z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: all } = await context.supabase.from("photo_templates").select("id, sort_order").order("sort_order", { ascending: true });
    if (!all) return { ok: true };
    const idx = all.findIndex((r) => r.id === data.id);
    if (idx < 0) return { ok: true };
    const swap = data.direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= all.length) return { ok: true };
    const a = all[idx], b = all[swap];
    await context.supabase.from("photo_templates").update({ sort_order: b.sort_order }).eq("id", a.id);
    await context.supabase.from("photo_templates").update({ sort_order: a.sort_order }).eq("id", b.id);
    return { ok: true };
  });

// ===== PER-EVENT linking (host) =====
export const getEventTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // verify host or admin via RLS scoping
    const { data: rows, error } = await context.supabase.from("event_templates")
      .select("template_id").eq("event_id", data.eventId);
    if (error) throw new Error(error.message);
    return rows?.map((r) => r.template_id) ?? [];
  });

export const setEventTemplates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventId: string; templateIds: string[] }) =>
    z.object({ eventId: z.string().uuid(), templateIds: z.array(z.string().uuid()).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    // Ensure host owns event (RLS will also enforce). Replace links.
    const { data: ev } = await context.supabase.from("events").select("id, host_id").eq("id", data.eventId).maybeSingle();
    if (!ev) throw new Error("Event not found");
    const isOwner = ev.host_id === context.userId;
    if (!isOwner) {
      const { data: roleRow } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
      if (!roleRow) throw new Error("Forbidden");
    }
    await context.supabase.from("event_templates").delete().eq("event_id", data.eventId);
    if (data.templateIds.length) {
      const rows = data.templateIds.map((tid, i) => ({ event_id: data.eventId, template_id: tid, sort_order: i }));
      const { error } = await context.supabase.from("event_templates").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ===== PUBLIC: list templates available at a guest event (by slug) =====
export const listTemplatesForEvent = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<TemplateRow[]> => {
    const sb = publicClient();
    const { data: ev } = await sb.from("events").select("id").eq("slug", data.slug).maybeSingle();
    if (!ev) return [];
    const { data: links } = await sb.from("event_templates").select("template_id, sort_order").eq("event_id", ev.id).order("sort_order", { ascending: true });
    let rows: { id: string; name: string; kind: string; preview_path: string | null; asset_path: string; is_active: boolean; sort_order: number }[] = [];
    if (links && links.length) {
      const ids = links.map((l) => l.template_id);
      const { data: tmpl } = await sb.from("photo_templates").select("id, name, kind, preview_path, asset_path, is_active, sort_order").in("id", ids).eq("is_active", true);
      // preserve event link order
      const ordering = new Map(links.map((l, i) => [l.template_id, i] as const));
      rows = (tmpl ?? []).slice().sort((a, b) => (ordering.get(a.id) ?? 0) - (ordering.get(b.id) ?? 0));
    } else {
      const { data: tmpl } = await sb.from("photo_templates").select("id, name, kind, preview_path, asset_path, is_active, sort_order").eq("is_active", true).order("sort_order", { ascending: true });
      rows = tmpl ?? [];
    }
    return rowsToTemplates(sb, rows);
  });
