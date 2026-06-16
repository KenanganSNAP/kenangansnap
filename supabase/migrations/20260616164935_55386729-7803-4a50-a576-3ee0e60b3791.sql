
-- 1. homepage_media
CREATE TABLE public.homepage_media (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL DEFAULT 'photo' CHECK (kind IN ('photo')),
  storage_path text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  is_hero boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.homepage_media TO authenticated;
GRANT ALL ON public.homepage_media TO service_role;
ALTER TABLE public.homepage_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read homepage media" ON public.homepage_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage homepage media" ON public.homepage_media FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. testimonials
CREATE TABLE public.testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name text NOT NULL,
  author_photo_path text,
  quote text NOT NULL,
  event_name text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read testimonials" ON public.testimonials FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage testimonials" ON public.testimonials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. events.status
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('draft','active','completed','cancelled'));

-- 4. event_audits
CREATE TABLE public.event_audits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.event_audits TO authenticated;
GRANT ALL ON public.event_audits TO service_role;
ALTER TABLE public.event_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts read audits for own events" ON public.event_audits FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_audits.event_id AND e.host_id = auth.uid())
  );
CREATE POLICY "Admins insert audits" ON public.event_audits FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Storage policies for site-assets bucket
CREATE POLICY "Anyone read site-assets" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'site-assets');
CREATE POLICY "Admins write site-assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update site-assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete site-assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-assets' AND has_role(auth.uid(), 'admin'::app_role));
