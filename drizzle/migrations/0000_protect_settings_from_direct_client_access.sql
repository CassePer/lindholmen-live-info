REVOKE ALL ON public.app_settings FROM anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.app_settings IS 'Read through the settings function; privileged changes require a server-verified admin session. Network configuration is never public.';