import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

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

export type PrintConfigFull = {
  enabled: boolean;
  url: string;
  secret: string;
  default_copies: number;
  max_copies: number;
  allow_override: boolean;
};

export type PrintConfigPublic = {
  enabled: boolean;
  default_copies: number;
  max_copies: number;
  allow_override: boolean;
};

const defaults: PrintConfigFull = {
  enabled: false,
  url: "",
  secret: "",
  default_copies: 1,
  max_copies: 4,
  allow_override: true,
};

async function loadConfig(sb: ReturnType<typeof publicClient>): Promise<PrintConfigFull> {
  const { data } = await sb.from("site_settings").select("settings").eq("key", "print_config").maybeSingle();
  return { ...defaults, ...((data?.settings as Partial<PrintConfigFull>) ?? {}) };
}

// PUBLIC: safe-field config for booth UI
export const getPrintConfigPublic = createServerFn({ method: "GET" })
  .handler(async (): Promise<PrintConfigPublic> => {
    const sb = publicClient();
    const cfg = await loadConfig(sb);
    return {
      enabled: cfg.enabled && cfg.url.length > 0,
      default_copies: cfg.default_copies,
      max_copies: cfg.max_copies,
      allow_override: cfg.allow_override,
    };
  });

// ADMIN: full config (URL + secret included)
export const getPrintConfigAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PrintConfigFull> => {
    await requireAdmin(context);
    return loadConfig(context.supabase);
  });

export const updatePrintConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { config: PrintConfigFull }) =>
    z.object({
      config: z.object({
        enabled: z.boolean(),
        url: z.string().max(500),
        secret: z.string().max(500),
        default_copies: z.number().int().min(1).max(10),
        max_copies: z.number().int().min(1).max(10),
        allow_override: z.boolean(),
      }),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("site_settings")
      .upsert({ key: "print_config", settings: data.config as unknown as Json, updated_at: new Date().toISOString(), updated_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// PUBLIC: submit a print job from the booth.
// We send the data URL directly to the printer endpoint as JSON.
export const submitPrintJob = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string; dataUrl: string; guestName: string; includeName: boolean; copies: number }) =>
    z.object({
      slug: z.string().min(1),
      dataUrl: z.string().startsWith("data:image/").max(20_000_000),
      guestName: z.string().max(120),
      includeName: z.boolean(),
      copies: z.number().int().min(1).max(10),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const cfg = await loadConfig(sb);
    if (!cfg.enabled || !cfg.url) throw new Error("Printing is not configured");
    const copies = cfg.allow_override
      ? Math.min(Math.max(data.copies, 1), cfg.max_copies)
      : cfg.default_copies;

    const { data: event } = await sb.from("events")
      .select("id, title").eq("slug", data.slug).maybeSingle();
    if (!event) throw new Error("Event not found");

    const payload = {
      photoDataUrl: data.dataUrl,
      eventId: event.id,
      eventTitle: event.title,
      guestName: data.includeName ? data.guestName : null,
      copies,
    };

    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.secret ? { "X-Print-Secret": cfg.secret } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Printer responded ${res.status}`);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });
