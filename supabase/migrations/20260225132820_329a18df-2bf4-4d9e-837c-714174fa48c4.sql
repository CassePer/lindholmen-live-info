
CREATE TABLE public.app_settings (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON public.app_settings FOR SELECT
  USING (true);

INSERT INTO public.app_settings (key, value) VALUES
  ('departure_refresh_interval', '60');
