DROP POLICY IF EXISTS "Anyone can read settings" ON public.app_settings;
REVOKE ALL ON public.app_settings FROM anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;