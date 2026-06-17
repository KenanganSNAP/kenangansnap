ALTER TABLE public.hosts ADD COLUMN IF NOT EXISTS contact_submitted boolean NOT NULL DEFAULT false;

UPDATE public.hosts SET contact_submitted = true
WHERE status = 'approved'
   OR (coalesce(trim(full_name), '') <> '' AND coalesce(trim(event_interest), '') <> '');