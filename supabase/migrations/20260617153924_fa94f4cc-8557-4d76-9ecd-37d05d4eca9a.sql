ALTER TABLE public.events ALTER COLUMN status SET DEFAULT 'draft';

UPDATE public.events SET status = 'active'
  WHERE status IS NULL OR status NOT IN ('draft','active','completed','cancelled');

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_guests integer NOT NULL DEFAULT 50;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_photos integer NOT NULL DEFAULT 100;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_notes  integer NOT NULL DEFAULT 100;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_voice  integer NOT NULL DEFAULT 50;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_prints integer NOT NULL DEFAULT 20;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_max_guests_min') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_max_guests_min CHECK (max_guests >= 50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_max_photos_min') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_max_photos_min CHECK (max_photos >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_max_notes_min') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_max_notes_min CHECK (max_notes >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_max_voice_min') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_max_voice_min CHECK (max_voice >= 1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_max_prints_min') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_max_prints_min CHECK (max_prints >= 0);
  END IF;
END $$;