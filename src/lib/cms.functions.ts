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

// ===== PAGE CONTENT (Pricing, How It Works, About) =====

export type Hero = { title: string; subtitle: string; image_path: string | null };
export type PricingTier = { name: string; price: string; period: string; features: string[]; cta_label: string; highlighted: boolean };
export type Step = { title: string; body: string; image_path: string | null };
export type TeamMember = { name: string; role: string; photo_path: string | null; bio: string };

export type PricingPage = {
  hero: Hero;
  tiers: PricingTier[];
  footer_note: string;
};
export type HowItWorksPage = {
  hero: Hero;
  steps: Step[];
  cta_label: string;
  cta_href: string;
};
export type AboutPage = {
  hero: Hero;
  mission: string;
  team: TeamMember[];
  closing: string;
};

const pricingDefaults: PricingPage = {
  hero: { title: "Simple pricing", subtitle: "Pick the package that matches your event. No subscriptions.", image_path: null },
  tiers: [
    { name: "Intimate", price: "RM 299", period: "per event", features: ["Up to 50 guests", "QR booth + album", "7-day photo storage"], cta_label: "Choose Intimate", highlighted: false },
    { name: "Celebration", price: "RM 599", period: "per event", features: ["Up to 200 guests", "QR booth + voice + notes", "30-day storage", "Custom invitation"], cta_label: "Choose Celebration", highlighted: true },
    { name: "Grand", price: "RM 999", period: "per event", features: ["Unlimited guests", "All features", "90-day storage", "Priority support"], cta_label: "Choose Grand", highlighted: false },
  ],
  footer_note: "All packages include unlimited photo downloads.",
};

const howItWorksDefaults: HowItWorksPage = {
  hero: { title: "How Kenangan works", subtitle: "From QR scan to private album in four steps.", image_path: null },
  steps: [
    { title: "1. Create your event", body: "Sign up, name your event, add a date and cover image.", image_path: null },
    { title: "2. Print the QR", body: "Download your event QR poster and place it at the entrance.", image_path: null },
    { title: "3. Guests capture moments", body: "Guests scan, snap a photo, leave a voice note or a written wish — no app.", image_path: null },
    { title: "4. Enjoy your album", body: "After the reveal, browse and download everything from one private link.", image_path: null },
  ],
  cta_label: "Start your event",
  cta_href: "/auth",
};

const aboutDefaults: AboutPage = {
  hero: { title: "About Kenangan", subtitle: "A memory booth for every gathering.", image_path: null },
  mission: "We believe every event deserves to be remembered through the eyes of the people who were there. Kenangan turns one QR code into a private, lasting album of photos, voices, and wishes.",
  team: [
    { name: "The Kenangan Team", role: "Founders", photo_path: null, bio: "Built with love in Malaysia for hosts who want to remember everything." },
  ],
  closing: "Made for weddings, birthdays, ceremonies, and any moment worth keeping.",
};

const PAGE_DEFAULTS = {
  pricing_page: pricingDefaults,
  how_it_works_page: howItWorksDefaults,
  about_page: aboutDefaults,
} as const;

type PageKey = keyof typeof PAGE_DEFAULTS;

function signPath(sb: ReturnType<typeof publicClient>, path: string | null) {
  if (!path) return Promise.resolve<string | null>(null);
  return sb.storage.from("site-assets").createSignedUrl(path, 60 * 60).then(({ data }) => data?.signedUrl ?? null);
}

async function signPageImages<T extends PricingPage | HowItWorksPage | AboutPage>(sb: ReturnType<typeof publicClient>, page: T): Promise<T & { _signed: Record<string, string | null> }> {
  const signed: Record<string, string | null> = {};
  signed["hero"] = await signPath(sb, page.hero.image_path);
  if ("steps" in page) {
    for (let i = 0; i < page.steps.length; i++) signed[`step_${i}`] = await signPath(sb, page.steps[i].image_path);
  }
  if ("team" in page) {
    for (let i = 0; i < page.team.length; i++) signed[`team_${i}`] = await signPath(sb, page.team[i].photo_path);
  }
  return { ...page, _signed: signed };
}

export const getPage = createServerFn({ method: "GET" })
  .inputValidator((d: { key: PageKey }) => z.object({ key: z.enum(["pricing_page", "how_it_works_page", "about_page"]) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row } = await sb.from("site_settings").select("settings").eq("key", data.key).maybeSingle();
    const defaults = PAGE_DEFAULTS[data.key];
    const merged = { ...defaults, ...(row?.settings as object ?? {}) } as PricingPage | HowItWorksPage | AboutPage;
    return signPageImages(sb, merged);
  });

export const updatePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: PageKey; settings: unknown }) =>
    z.object({
      key: z.enum(["pricing_page", "how_it_works_page", "about_page"]),
      settings: z.any(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("site_settings")
      .upsert({ key: data.key, settings: data.settings as Json, updated_at: new Date().toISOString(), updated_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Upload a site asset (admin only). Returns the storage path.
export const uploadSiteAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { folder: string; dataUrl: string }) =>
    z.object({
      folder: z.string().regex(/^[a-z0-9_-]+$/).max(40),
      dataUrl: z.string().startsWith("data:").max(10_000_000),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const [meta, b64] = data.dataUrl.split(",");
    const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${data.folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await context.supabase.storage.from("site-assets").upload(path, bytes, { contentType: mime, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });

// ===== HOMEPAGE MEDIA (gallery + hero) =====

export const listHomepageMedia = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = publicClient();
    const { data, error } = await sb.from("homepage_media").select("id, storage_path, caption, sort_order, is_hero, created_at").order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = await Promise.all((data ?? []).map(async (r) => ({
      ...r,
      signed_url: await signPath(sb, r.storage_path),
    })));
    return rows;
  });

export const addHomepageMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dataUrl: string; caption: string | null }) =>
    z.object({ dataUrl: z.string().startsWith("data:image/").max(10_000_000), caption: z.string().max(200).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const [meta, b64] = data.dataUrl.split(",");
    const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `homepage/${crypto.randomUUID()}.${ext}`;
    const upRes = await context.supabase.storage.from("site-assets").upload(path, bytes, { contentType: mime, upsert: false });
    if (upRes.error) throw new Error(upRes.error.message);
    const { data: maxRow } = await context.supabase.from("homepage_media").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const sort_order = (maxRow?.sort_order ?? 0) + 1;
    const { error } = await context.supabase.from("homepage_media").insert({ storage_path: path, caption: data.caption, sort_order });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHomepageMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row } = await context.supabase.from("homepage_media").select("storage_path").eq("id", data.id).maybeSingle();
    if (row?.storage_path) await context.supabase.storage.from("site-assets").remove([row.storage_path]);
    const { error } = await context.supabase.from("homepage_media").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setHomepageHero = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    await context.supabase.from("homepage_media").update({ is_hero: false }).neq("id", data.id);
    const { error } = await context.supabase.from("homepage_media").update({ is_hero: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderHomepageMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; direction: "up" | "down" }) =>
    z.object({ id: z.string().uuid(), direction: z.enum(["up", "down"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: all } = await context.supabase.from("homepage_media").select("id, sort_order").order("sort_order", { ascending: true });
    if (!all) return { ok: true };
    const idx = all.findIndex((r) => r.id === data.id);
    if (idx < 0) return { ok: true };
    const swapIdx = data.direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= all.length) return { ok: true };
    const a = all[idx];
    const b = all[swapIdx];
    await context.supabase.from("homepage_media").update({ sort_order: b.sort_order }).eq("id", a.id);
    await context.supabase.from("homepage_media").update({ sort_order: a.sort_order }).eq("id", b.id);
    return { ok: true };
  });

// ===== TESTIMONIALS =====

export const listTestimonials = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = publicClient();
    const { data, error } = await sb.from("testimonials").select("id, author_name, author_photo_path, quote, event_name, sort_order").order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = await Promise.all((data ?? []).map(async (r) => ({
      ...r,
      signed_url: await signPath(sb, r.author_photo_path),
    })));
    return rows;
  });

export const upsertTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string | null; author_name: string; quote: string; event_name: string | null; photo_data_url: string | null }) =>
    z.object({
      id: z.string().uuid().nullable(),
      author_name: z.string().min(1).max(80),
      quote: z.string().min(1).max(600),
      event_name: z.string().max(120).nullable(),
      photo_data_url: z.string().startsWith("data:image/").max(5_000_000).nullable(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    let photoPath: string | null = null;
    if (data.photo_data_url) {
      const [meta, b64] = data.photo_data_url.split(",");
      const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
      const ext = mime.includes("png") ? "png" : "jpg";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      photoPath = `testimonials/${crypto.randomUUID()}.${ext}`;
      const up = await context.supabase.storage.from("site-assets").upload(photoPath, bytes, { contentType: mime, upsert: false });
      if (up.error) throw new Error(up.error.message);
    }
    if (data.id) {
      const update: { author_name: string; quote: string; event_name: string | null; updated_at: string; author_photo_path?: string } = {
        author_name: data.author_name, quote: data.quote, event_name: data.event_name,
        updated_at: new Date().toISOString(),
      };
      if (photoPath) update.author_photo_path = photoPath;
      const { error } = await context.supabase.from("testimonials").update(update).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { data: maxRow } = await context.supabase.from("testimonials").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
      const sort_order = (maxRow?.sort_order ?? 0) + 1;
      const { error } = await context.supabase.from("testimonials").insert({
        author_name: data.author_name, quote: data.quote, event_name: data.event_name,
        author_photo_path: photoPath, sort_order,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: row } = await context.supabase.from("testimonials").select("author_photo_path").eq("id", data.id).maybeSingle();
    if (row?.author_photo_path) await context.supabase.storage.from("site-assets").remove([row.author_photo_path]);
    const { error } = await context.supabase.from("testimonials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== HOMEPAGE EXTRA SETTINGS (featured video) =====
export type HomepageExtras = { video_url: string };
const extrasDefaults: HomepageExtras = { video_url: "" };

export const getHomepageExtras = createServerFn({ method: "GET" })
  .handler(async (): Promise<HomepageExtras> => {
    const sb = publicClient();
    const { data } = await sb.from("site_settings").select("settings").eq("key", "homepage_extras").maybeSingle();
    return { ...extrasDefaults, ...(data?.settings as Partial<HomepageExtras> ?? {}) };
  });

export const updateHomepageExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { settings: HomepageExtras }) =>
    z.object({ settings: z.object({ video_url: z.string().max(500) }) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("site_settings")
      .upsert({ key: "homepage_extras", settings: data.settings as unknown as Json, updated_at: new Date().toISOString(), updated_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== CREATE EVENT FORM CONFIG =====

export type CreateEventFieldType = "text" | "textarea" | "date" | "datetime" | "select" | "image";
export type CreateEventField = {
  key: string;
  label: string;
  type: CreateEventFieldType;
  required: boolean;
  visible: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // for select
  builtin: boolean;
};
export type CreateEventFormConfig = { fields: CreateEventField[] };

export const BUILTIN_FIELD_KEYS = ["title", "slug", "eventType", "date", "venue", "welcomeMessage", "revealAt", "cover", "invitation"] as const;

const createEventFormDefaults: CreateEventFormConfig = {
  fields: [
    { key: "title", label: "Event title", type: "text", required: true, visible: true, placeholder: "Aisha & Daniel", builtin: true },
    { key: "slug", label: "Event web address", type: "text", required: false, visible: true, helpText: "Auto-generated from your title — ready to share.", builtin: true },
    { key: "eventType", label: "Type", type: "select", required: true, visible: true, options: ["wedding", "birthday", "party", "travel", "ceremony"], builtin: true },
    { key: "date", label: "Date", type: "date", required: false, visible: true, builtin: true },
    { key: "venue", label: "Venue", type: "text", required: false, visible: true, placeholder: "KLCC Convention Centre", builtin: true },
    { key: "welcomeMessage", label: "Welcome message", type: "textarea", required: false, visible: true, placeholder: "Bismillah — welcome to our special day…", builtin: true },
    { key: "revealAt", label: "Reveal at (leave blank for instant reveal)", type: "datetime", required: false, visible: true, builtin: true },
    { key: "cover", label: "Cover photo", type: "image", required: false, visible: true, builtin: true },
    { key: "invitation", label: "Invitation image", type: "image", required: false, visible: true, builtin: true },
  ],
};

export const getCreateEventForm = createServerFn({ method: "GET" })
  .handler(async (): Promise<CreateEventFormConfig> => {
    const sb = publicClient();
    const { data } = await sb.from("site_settings").select("settings").eq("key", "create_event_form").maybeSingle();
    const stored = (data?.settings as Partial<CreateEventFormConfig> | null);
    if (!stored?.fields?.length) return createEventFormDefaults;
    // Ensure every builtin still appears (admin can hide but not remove)
    const byKey = new Map(stored.fields.map((f) => [f.key, f]));
    const merged: CreateEventField[] = [];
    for (const builtinKey of BUILTIN_FIELD_KEYS) {
      const def = createEventFormDefaults.fields.find((f) => f.key === builtinKey)!;
      const existing = byKey.get(builtinKey);
      merged.push(existing ? { ...def, ...existing, builtin: true } : def);
    }
    for (const f of stored.fields) {
      if (!BUILTIN_FIELD_KEYS.includes(f.key as typeof BUILTIN_FIELD_KEYS[number])) merged.push({ ...f, builtin: false });
    }
    // Preserve admin ordering when present
    const order = stored.fields.map((f) => f.key);
    merged.sort((a, b) => {
      const ai = order.indexOf(a.key);
      const bi = order.indexOf(b.key);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return { fields: merged };
  });

const fieldSchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  label: z.string().min(1).max(120),
  type: z.enum(["text", "textarea", "date", "datetime", "select", "image"]),
  required: z.boolean(),
  visible: z.boolean(),
  placeholder: z.string().max(160).optional(),
  helpText: z.string().max(240).optional(),
  options: z.array(z.string().min(1).max(60)).max(20).optional(),
  builtin: z.boolean(),
});

export const updateCreateEventForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { config: CreateEventFormConfig }) =>
    z.object({ config: z.object({ fields: z.array(fieldSchema).max(40) }) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    // Builtins must all be present, and custom field keys must not collide with builtins
    const builtins = new Set<string>(BUILTIN_FIELD_KEYS);
    const seen = new Set<string>();
    for (const f of data.config.fields) {
      if (seen.has(f.key)) throw new Error(`Duplicate field key: ${f.key}`);
      seen.add(f.key);
      if (f.builtin && !builtins.has(f.key)) throw new Error(`Unknown builtin: ${f.key}`);
      if (!f.builtin && builtins.has(f.key)) throw new Error(`Reserved key: ${f.key}`);
    }
    for (const k of BUILTIN_FIELD_KEYS) {
      if (!seen.has(k)) throw new Error(`Missing builtin field: ${k}`);
    }
    const { error } = await context.supabase.from("site_settings")
      .upsert({ key: "create_event_form", settings: data.config as unknown as Json, updated_at: new Date().toISOString(), updated_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
