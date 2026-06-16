
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'host');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Hosts (status / approval)
CREATE TABLE public.hosts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hosts TO authenticated;
GRANT ALL ON public.hosts TO service_role;
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts read own row" ON public.hosts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage hosts" ON public.hosts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'wedding',
  date DATE,
  venue TEXT,
  cover_image_url TEXT,
  invitation_image_url TEXT,
  welcome_message TEXT,
  reveal_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon read active events" ON public.events FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY "Auth read events (own or active or admin)" ON public.events FOR SELECT TO authenticated
USING (host_id = auth.uid() OR is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Approved hosts create events" ON public.events FOR INSERT TO authenticated
WITH CHECK (host_id = auth.uid() AND EXISTS (SELECT 1 FROM public.hosts h WHERE h.user_id = auth.uid() AND h.status = 'approved'));
CREATE POLICY "Hosts/admin update events" ON public.events FOR UPDATE TO authenticated
USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Hosts/admin delete events" ON public.events FOR DELETE TO authenticated
USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Guests
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, session_token)
);
GRANT SELECT, INSERT ON public.guests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests TO authenticated;
GRANT ALL ON public.guests TO service_role;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon insert guest into active event" ON public.guests FOR INSERT TO anon
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true));
CREATE POLICY "Auth insert guest into active event" ON public.guests FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true));
CREATE POLICY "Anon read guests of active event" ON public.guests FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true));
CREATE POLICY "Auth read guests (host/admin or active)" ON public.guests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.host_id = auth.uid() OR e.is_active = true OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Host/admin delete guests" ON public.guests FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Photos
CREATE TABLE public.photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo')),
  filter_applied TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon insert photo into active event" ON public.photos FOR INSERT TO anon
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true));
CREATE POLICY "Auth insert photo into active event" ON public.photos FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true));
CREATE POLICY "Anon read photos after reveal" ON public.photos FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true AND (e.reveal_at IS NULL OR now() >= e.reveal_at)));
CREATE POLICY "Auth read photos (host/admin always, others after reveal)" ON public.photos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR (e.is_active = true AND (e.reveal_at IS NULL OR now() >= e.reveal_at)))));
CREATE POLICY "Host/admin delete photos" ON public.photos FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Memories (notes + voice)
CREATE TABLE public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('note','voice')),
  content TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.memories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memories TO authenticated;
GRANT ALL ON public.memories TO service_role;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon insert memory into active event" ON public.memories FOR INSERT TO anon
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true));
CREATE POLICY "Auth insert memory into active event" ON public.memories FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true));
CREATE POLICY "Anon read memories after reveal" ON public.memories FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.is_active = true AND (e.reveal_at IS NULL OR now() >= e.reveal_at)));
CREATE POLICY "Auth read memories (host/admin always, others after reveal)" ON public.memories FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR (e.is_active = true AND (e.reveal_at IS NULL OR now() >= e.reveal_at)))));
CREATE POLICY "Host/admin delete memories" ON public.memories FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND (e.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

-- Signup trigger: creates host row + grants admin to designated email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.hosts (user_id, email, status)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'kenanganboothbn@gmail.com' THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'host')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF NEW.email = 'kenanganboothbn@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket RLS policies (buckets are created via tool)
-- Allow anon to upload event photos & voice; hosts/admin to manage event covers/invitations
CREATE POLICY "Anyone can read public buckets" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id IN ('event-covers','event-invitations','photos','audio-memories'));

CREATE POLICY "Anon upload photos" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Anon upload audio" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'audio-memories');

CREATE POLICY "Auth upload event covers" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-covers');

CREATE POLICY "Auth update event covers" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-covers') WITH CHECK (bucket_id = 'event-covers');

CREATE POLICY "Auth upload invitations" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-invitations');

CREATE POLICY "Auth update invitations" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-invitations') WITH CHECK (bucket_id = 'event-invitations');

CREATE POLICY "Auth delete media (any of our buckets)" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('event-covers','event-invitations','photos','audio-memories'));
