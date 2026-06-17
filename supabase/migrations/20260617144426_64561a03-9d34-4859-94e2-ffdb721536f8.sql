ALTER TABLE public.event_audits
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'event',
  ADD COLUMN IF NOT EXISTS entity_id uuid;

UPDATE public.event_audits SET entity_id = event_id WHERE entity_id IS NULL;

CREATE INDEX IF NOT EXISTS event_audits_entity_idx ON public.event_audits (entity_type, entity_id);