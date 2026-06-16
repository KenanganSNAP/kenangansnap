
CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (key, settings) VALUES (
  'homepage',
  '{
    "hero_eyebrow": "A live memory booth",
    "hero_title_line1": "Every guest.",
    "hero_title_line2": "Every memory.",
    "hero_subtitle": "One QR code at the door. Your guests send photos, voice notes, and heartfelt messages straight to your private album — no app, no sign-ups.",
    "cta_primary": "Start your event",
    "cta_secondary": "See how it works",
    "section_title": "A booth without a booth",
    "section_subtitle": "Four ways your guests can leave something behind — gathered into one elegant private album.",
    "features": [
      {"title": "One QR", "body": "Print it, frame it, project it. Guests scan and they''re in."},
      {"title": "Film photos", "body": "Live camera with five tactile film filters — warm, fade, noir, golden, cinematic."},
      {"title": "Voice notes", "body": "Hold-to-record up to 60 seconds. The voice you remember, kept forever."},
      {"title": "Written wishes", "body": "A small page for the long messages — doa, jokes, secrets."}
    ],
    "footer_note": "Crafted with care"
  }'::jsonb
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.hosts (user_id, email, status)
  VALUES (NEW.id, NEW.email, 'approved')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'host')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF NEW.email = 'kenanganboothbn@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
