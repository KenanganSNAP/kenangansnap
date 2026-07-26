CREATE OR REPLACE FUNCTION public.submit_guest_photo(
  p_slug text,
  p_guest_id uuid,
  p_guest_name text,
  p_storage_url text,
  p_filter_applied text DEFAULT NULL,
  p_original_url text DEFAULT NULL,
  p_template_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    template_id
  ) VALUES (
    v_event_id,
    p_guest_id,
    v_guest_name,
    p_storage_url,
    'photo',
    NULLIF(p_filter_applied, ''),
    p_original_url,
    p_template_id
  )
  RETURNING id INTO v_photo_id;

  RETURN v_photo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_guest_note(
  p_slug text,
  p_guest_id uuid,
  p_guest_name text,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
  v_status text;
  v_max_notes int;
  v_count int;
  v_guest_name text;
  v_memory_id uuid;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'Invalid event link';
  END IF;
  IF p_content IS NULL OR length(btrim(p_content)) = 0 OR length(p_content) > 500 THEN
    RAISE EXCEPTION 'Invalid note';
  END IF;

  SELECT e.id, e.status, e.max_notes
    INTO v_event_id, v_status, v_max_notes
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

  SELECT count(*) INTO v_count FROM public.memories WHERE event_id = v_event_id AND type = 'note';
  IF v_count >= COALESCE(v_max_notes, 100) THEN
    RAISE EXCEPTION 'Note limit reached';
  END IF;

  INSERT INTO public.memories (
    event_id,
    guest_id,
    guest_name,
    type,
    content
  ) VALUES (
    v_event_id,
    p_guest_id,
    v_guest_name,
    'note',
    btrim(p_content)
  )
  RETURNING id INTO v_memory_id;

  RETURN v_memory_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_guest_voice(
  p_slug text,
  p_guest_id uuid,
  p_guest_name text,
  p_audio_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id uuid;
  v_status text;
  v_max_voice int;
  v_count int;
  v_guest_name text;
  v_memory_id uuid;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'Invalid event link';
  END IF;
  IF p_audio_url IS NULL OR length(btrim(p_audio_url)) = 0 THEN
    RAISE EXCEPTION 'Missing voice recording';
  END IF;

  SELECT e.id, e.status, e.max_voice
    INTO v_event_id, v_status, v_max_voice
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

  IF split_part(p_audio_url, '/', 1) <> v_event_id::text THEN
    RAISE EXCEPTION 'Voice path does not match this event';
  END IF;

  SELECT count(*) INTO v_count FROM public.memories WHERE event_id = v_event_id AND type = 'voice';
  IF v_count >= COALESCE(v_max_voice, 50) THEN
    RAISE EXCEPTION 'Voice message limit reached';
  END IF;

  INSERT INTO public.memories (
    event_id,
    guest_id,
    guest_name,
    type,
    audio_url
  ) VALUES (
    v_event_id,
    p_guest_id,
    v_guest_name,
    'voice',
    p_audio_url
  )
  RETURNING id INTO v_memory_id;

  RETURN v_memory_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_guest_photo(text, uuid, text, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_guest_note(text, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_guest_voice(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_guest_photo(text, uuid, text, text, text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_note(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_guest_voice(text, uuid, text, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Upload guest photos" ON storage.objects;
CREATE POLICY "Upload guest photos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = public._storage_event_id(storage.objects.name)
      AND e.status = 'active'
  )
);

DROP POLICY IF EXISTS "Upload guest audio" ON storage.objects;
CREATE POLICY "Upload guest audio"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'audio-memories'
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = public._storage_event_id(storage.objects.name)
      AND e.status = 'active'
  )
);

DROP POLICY IF EXISTS "Read photos and audio memories" ON storage.objects;
CREATE POLICY "Read photos and audio memories"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = ANY (ARRAY['photos', 'audio-memories'])
  AND EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = public._storage_event_id(storage.objects.name)
      AND (
        e.status IN ('active', 'completed')
        AND (e.reveal_at IS NULL OR now() >= e.reveal_at)
        OR (auth.role() = 'authenticated' AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
      )
  )
);

DROP POLICY IF EXISTS "Anon insert photo into active event" ON public.photos;
CREATE POLICY "Anon insert photo into active event"
ON public.photos
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = photos.event_id AND e.status = 'active'
  )
);

DROP POLICY IF EXISTS "Auth insert photo into active event" ON public.photos;
CREATE POLICY "Auth insert photo into active event"
ON public.photos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = photos.event_id AND e.status = 'active'
  )
);

DROP POLICY IF EXISTS "Anon insert memory into active event" ON public.memories;
CREATE POLICY "Anon insert memory into active event"
ON public.memories
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = memories.event_id AND e.status = 'active'
  )
);

DROP POLICY IF EXISTS "Auth insert memory into active event" ON public.memories;
CREATE POLICY "Auth insert memory into active event"
ON public.memories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = memories.event_id AND e.status = 'active'
  )
);