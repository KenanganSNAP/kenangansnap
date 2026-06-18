
-- 1) Restrict public read on site_settings to exclude sensitive print_config row
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view non-sensitive site settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (key <> 'print_config');

-- 2) Remove direct INSERT on guests; force server-generated session tokens via a SECURITY DEFINER function
DROP POLICY IF EXISTS "Anon insert guest into active event" ON public.guests;
DROP POLICY IF EXISTS "Auth insert guest into active event" ON public.guests;

CREATE OR REPLACE FUNCTION public.register_guest(p_slug text, p_name text)
RETURNS TABLE(guest_id uuid, guest_name text, session_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
  v_max_guests int;
  v_count int;
  v_token text;
  v_id uuid;
BEGIN
  IF p_name IS NULL OR length(btrim(p_name)) = 0 OR length(p_name) > 60 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;

  SELECT e.id, e.max_guests INTO v_event_id, v_max_guests
  FROM public.events e
  WHERE e.slug = p_slug AND e.is_active = true;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or inactive';
  END IF;

  SELECT count(*) INTO v_count FROM public.guests WHERE event_id = v_event_id;
  IF v_count >= v_max_guests THEN
    RAISE EXCEPTION 'Guest cap reached for this event';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.guests (event_id, name, session_token)
  VALUES (v_event_id, p_name, v_token)
  RETURNING id INTO v_id;

  guest_id := v_id;
  guest_name := p_name;
  session_token := v_token;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.register_guest(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_guest(text, text) TO anon, authenticated;
