DROP POLICY IF EXISTS "Anyone can view active templates" ON public.photo_templates;
CREATE POLICY "Anyone can view active templates" ON public.photo_templates
  FOR SELECT TO anon, authenticated USING (is_active = true);