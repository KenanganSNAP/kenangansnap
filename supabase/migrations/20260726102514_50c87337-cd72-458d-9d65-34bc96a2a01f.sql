DROP FUNCTION IF EXISTS public.register_guest(text, text);

CREATE OR REPLACE FUNCTION public.register_guest(p_slug text, p_name text, p_token text DEFAULT NULL::text)
 RETURNS TABLE(guest_id uuid, guest_name text, session_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid;
  v_max_guests int;
  v_count int;
  v_token text;
  v_id uuid;
  v_existing_id uuid;
  v_existing_name text;
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

  IF p_token IS NOT NULL AND length(p_token) >= 8 THEN
    SELECT g.id, g.name INTO v_existing_id, v_existing_name
    FROM public.guests g
    WHERE g.event_id = v_event_id AND g.session_token = p_token
    LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      guest_id := v_existing_id;
      guest_name := v_existing_name;
      session_token := p_token;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  SELECT count(*) INTO v_count FROM public.guests WHERE event_id = v_event_id;
  IF v_count >= v_max_guests THEN
    RAISE EXCEPTION 'Guest cap reached for this event';
  END IF;

  v_token := COALESCE(NULLIF(p_token, ''), replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

  INSERT INTO public.guests (event_id, name, session_token)
  VALUES (v_event_id, p_name, v_token)
  RETURNING id INTO v_id;

  guest_id := v_id;
  guest_name := p_name;
  session_token := v_token;
  RETURN NEXT;
END;
$function$;