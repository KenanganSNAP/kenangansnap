-- Extend hosts with contact fields
ALTER TABLE public.hosts
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS event_interest text,
  ADD COLUMN IF NOT EXISTS contact_updated_at timestamptz;

-- New signups default to 'pending' (the seeded admin stays auto-approved)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'kenanganboothbn@gmail.com' THEN
    INSERT INTO public.hosts (user_id, email, status)
    VALUES (NEW.id, NEW.email, 'approved')
    ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.hosts (user_id, email, status)
    VALUES (NEW.id, NEW.email, 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'host')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Allow hosts to update only their own contact fields (not status/email)
DROP POLICY IF EXISTS "Hosts update own contact" ON public.hosts;
CREATE POLICY "Hosts update own contact" ON public.hosts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin notification preferences
CREATE TABLE IF NOT EXISTS public.admin_notification_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_new_signups boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notification_prefs TO authenticated;
GRANT ALL ON public.admin_notification_prefs TO service_role;

ALTER TABLE public.admin_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage own prefs" ON public.admin_notification_prefs;
CREATE POLICY "Admins manage own prefs" ON public.admin_notification_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_admin_notification_prefs_updated_at ON public.admin_notification_prefs;
CREATE TRIGGER trg_admin_notification_prefs_updated_at
  BEFORE UPDATE ON public.admin_notification_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();