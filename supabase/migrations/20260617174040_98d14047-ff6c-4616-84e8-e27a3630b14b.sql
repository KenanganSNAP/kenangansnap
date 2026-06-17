
-- 1. Safe guest self-lookup RPC (replaces anon SELECT on guests)
CREATE OR REPLACE FUNCTION public.get_guest_by_token(p_slug text, p_token text)
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name
  FROM public.guests g
  JOIN public.events e ON e.id = g.event_id
  WHERE e.slug = p_slug
    AND g.session_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_guest_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_by_token(text, text) TO anon, authenticated;

-- 2. Tighten guests SELECT policies
DROP POLICY IF EXISTS "Anon read guests of active event" ON public.guests;
DROP POLICY IF EXISTS "Auth read guests (host/admin or active)" ON public.guests;

CREATE POLICY "Host/admin read guests"
  ON public.guests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = guests.event_id
      AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  ));

-- 3. event_templates — restrict public read
DROP POLICY IF EXISTS "Anyone can view event templates" ON public.event_templates;

CREATE POLICY "Read event templates for active or owned events"
  ON public.event_templates FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_templates.event_id
      AND (
        e.is_active = true
        OR e.host_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
      )
  ));

-- 4. Storage policy hardening (paths are `<event_id>/<file>`)
DROP POLICY IF EXISTS "Anyone can read public buckets" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload event covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth update event covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload invitations" ON storage.objects;
DROP POLICY IF EXISTS "Auth update invitations" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete media (any of our buckets)" ON storage.objects;

-- Helper: parse event id from path prefix
CREATE OR REPLACE FUNCTION public._storage_event_id(p_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN split_part(p_name, '/', 1) ~ '^[0-9a-fA-F-]{36}$'
    THEN split_part(p_name, '/', 1)::uuid
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public._storage_event_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._storage_event_id(text) TO anon, authenticated;

-- SELECT: covers/invitations readable while event is active or by host/admin
CREATE POLICY "Read event covers and invitations"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id IN ('event-covers', 'event-invitations')
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name)
        AND (
          e.is_active = true
          OR e.host_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- SELECT: photos/audio readable to host/admin always, to others only after reveal
CREATE POLICY "Read photos and audio memories"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id IN ('photos', 'audio-memories')
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name)
        AND (
          e.host_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR (e.is_active = true AND (e.reveal_at IS NULL OR now() >= e.reveal_at))
        )
    )
  );

-- INSERT photos/audio: anyone may upload to an active event's folder
CREATE POLICY "Upload guest photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name) AND e.is_active = true
    )
  );

CREATE POLICY "Upload guest audio"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'audio-memories'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name) AND e.is_active = true
    )
  );

-- INSERT/UPDATE covers and invitations: only the host of that event (or admin)
CREATE POLICY "Host upload event covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-covers'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name)
        AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Host update event covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name)
        AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    bucket_id = 'event-covers'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name)
        AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Host upload invitations"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-invitations'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name)
        AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Host update invitations"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-invitations'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name)
        AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    bucket_id = 'event-invitations'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name)
        AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- DELETE on event buckets: only host of event (or admin)
CREATE POLICY "Host delete event media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('event-covers', 'event-invitations', 'photos', 'audio-memories')
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = public._storage_event_id(name)
        AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- 5. Lock down has_role from anonymous callers
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
