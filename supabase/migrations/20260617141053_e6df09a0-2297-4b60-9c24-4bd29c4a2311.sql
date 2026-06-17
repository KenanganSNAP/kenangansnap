
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.photo_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('frame','overlay')),
  preview_path text,
  asset_path text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.photo_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photo_templates TO authenticated;
GRANT ALL ON public.photo_templates TO service_role;

ALTER TABLE public.photo_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON public.photo_templates FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage templates"
  ON public.photo_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER photo_templates_updated_at
  BEFORE UPDATE ON public.photo_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.photo_templates(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, template_id)
);

GRANT SELECT ON public.event_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_templates TO authenticated;
GRANT ALL ON public.event_templates TO service_role;

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event templates"
  ON public.event_templates FOR SELECT
  USING (true);

CREATE POLICY "Host manages own event templates"
  ON public.event_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  );

CREATE INDEX event_templates_event_id_idx ON public.event_templates(event_id);

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS original_url text,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.photo_templates(id) ON DELETE SET NULL;
