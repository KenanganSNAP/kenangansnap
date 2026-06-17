-- Seed/ensure a row exists for print_config in site_settings. Stored as JSON.
INSERT INTO public.site_settings (key, settings)
VALUES ('print_config', '{"enabled": false, "url": "", "secret": "", "default_copies": 1, "max_copies": 4, "allow_override": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;