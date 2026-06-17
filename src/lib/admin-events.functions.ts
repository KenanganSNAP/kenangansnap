import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

function _typedClient() {
  return createClient<Database>("", "");
}

async function requireAdmin(context: { supabase: ReturnType<typeof _typedClient>; userId: string }) {
  const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const getAdminEventDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: event, error } = await context.supabase.from("events").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!event) throw new Error("Event not found");
    const [{ data: host }, { count: guests }, { count: photos }, { count: memories }, { data: audits }] = await Promise.all([
      context.supabase.from("hosts").select("email, status").eq("user_id", event.host_id).maybeSingle(),
      context.supabase.from("guests").select("id", { count: "exact", head: true }).eq("event_id", data.id),
      context.supabase.from("photos").select("id", { count: "exact", head: true }).eq("event_id", data.id),
      context.supabase.from("memories").select("id", { count: "exact", head: true }).eq("event_id", data.id),
      context.supabase.from("event_audits").select("id, edited_by, changed_fields, note, created_at").eq("event_id", data.id).order("created_at", { ascending: false }),
    ]);
    return {
      event,
      host: host ?? null,
      counts: { guests: guests ?? 0, photos: photos ?? 0, memories: memories ?? 0 },
      audits: audits ?? [],
    };
  });

const editableFields = [
  "title", "event_type", "date", "venue", "welcome_message", "reveal_at", "status",
  "max_guests", "max_photos", "max_notes", "max_voice", "max_prints",
] as const;
type EditableKey = typeof editableFields[number];
type EditableValues = Partial<Record<EditableKey, string | number | null>>;

export const adminUpdateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; changes: EditableValues }) =>
    z.object({
      id: z.string().uuid(),
      changes: z.object({
        title: z.string().min(1).max(120).optional(),
        event_type: z.enum(["wedding", "birthday", "party", "travel", "ceremony"]).optional(),
        date: z.string().nullable().optional(),
        venue: z.string().max(200).nullable().optional(),
        welcome_message: z.string().max(500).nullable().optional(),
        reveal_at: z.string().nullable().optional(),
        status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
        max_guests: z.number().int().min(50).max(100000).optional(),
        max_photos: z.number().int().min(1).max(100000).optional(),
        max_notes:  z.number().int().min(1).max(100000).optional(),
        max_voice:  z.number().int().min(1).max(100000).optional(),
        max_prints: z.number().int().min(0).max(100000).optional(),
      }),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: before, error: beforeErr } = await context.supabase.from("events").select("*").eq("id", data.id).maybeSingle();
    if (beforeErr) throw new Error(beforeErr.message);
    if (!before) throw new Error("Event not found");
    type EventRow = Record<EditableKey, string | number | null>;
    const beforeRow = before as unknown as EventRow;

    const changes = { ...data.changes };
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of Object.keys(changes) as EditableKey[]) {
      const newVal = changes[k];
      const oldVal = beforeRow[k] ?? null;
      if (newVal !== undefined && newVal !== oldVal) {
        diff[k] = { from: oldVal, to: newVal };
      }
    }
    if (Object.keys(diff).length === 0) return { ok: true, changed: 0 };

    const { error: updErr } = await context.supabase.from("events").update(changes).eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    const { error: auditErr } = await context.supabase.from("event_audits").insert({
      event_id: data.id,
      edited_by: context.userId,
      changed_fields: diff as unknown as Json,
      note: "Edited by Admin",
    });
    if (auditErr) throw new Error(auditErr.message);
    return { ok: true, changed: Object.keys(diff).length };
  });
