ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.submit_guest_photo(p_slug text, p_guest_id uuid, p_guest_name text, p_storage_url text, p_filter_applied text DEFAULT NULL::text, p_original_url text DEFAULT NULL::text, p_template_id uuid DEFAULT NULL::uuid, p_allow_download boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid;
  v_status text;
  v_max_photos int;
  v_count int;
  v_guest_name text;
  v_photo_id uuid;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'Invalid event link';
  END IF;
  IF p_guest_name IS NULL OR length(btrim(p_guest_name)) = 0 OR length(p_guest_name) > 60 THEN
    RAISE EXCEPTION 'Invalid guest name';
  END IF;
  IF p_storage_url IS NULL OR length(btrim(p_storage_url)) = 0 THEN
    RAISE EXCEPTION 'Missing photo';
  END IF;

  SELECT e.id, e.status, e.max_photos
    INTO v_event_id, v_status, v_max_photos
  FROM public.events e
  WHERE e.slug = p_slug
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;
  IF v_status <> 'active' THEN
    IF v_status = 'cancelled' THEN
      RAISE EXCEPTION 'This event has been cancelled';
    ELSIF v_status = 'completed' THEN
      RAISE EXCEPTION 'This event has ended';
    ELSE
      RAISE EXCEPTION 'Event not available';
    END IF;
  END IF;

  SELECT g.name INTO v_guest_name
  FROM public.guests g
  WHERE g.id = p_guest_id AND g.event_id = v_event_id
  LIMIT 1;

  IF v_guest_name IS NULL THEN
    RAISE EXCEPTION 'Guest session not found for this event';
  END IF;

  IF split_part(p_storage_url, '/', 1) <> v_event_id::text THEN
    RAISE EXCEPTION 'Photo path does not match this event';
  END IF;
  IF p_original_url IS NOT NULL AND split_part(p_original_url, '/', 1) <> v_event_id::text THEN
    RAISE EXCEPTION 'Original photo path does not match this event';
  END IF;

  SELECT count(*) INTO v_count FROM public.photos WHERE event_id = v_event_id;
  IF v_count >= COALESCE(v_max_photos, 100) THEN
    RAISE EXCEPTION 'Photo limit reached';
  END IF;

  INSERT INTO public.photos (
    event_id,
    guest_id,
    guest_name,
    storage_url,
    media_type,
    filter_applied,
    original_url,
    template_id,
    allow_download
  ) VALUES (
    v_event_id,
    p_guest_id,
    v_guest_name,
    p_storage_url,
    'photo',
    NULLIF(p_filter_applied, ''),
    p_original_url,
    p_template_id,
    COALESCE(p_allow_download, true)
  )
  RETURNING id INTO v_photo_id;

  RETURN v_photo_id;
END;
$function$;