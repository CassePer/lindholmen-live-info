
-- Cache table for weekly lunch menus
CREATE TABLE public.lunch_menu_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_key TEXT NOT NULL, -- e.g. "2026-W09"
  restaurant_id TEXT NOT NULL,
  menu_data JSONB NOT NULL, -- full LunchMenu object
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One entry per restaurant per week
CREATE UNIQUE INDEX idx_lunch_cache_week_restaurant ON public.lunch_menu_cache (week_key, restaurant_id);

-- Index for fast week lookups
CREATE INDEX idx_lunch_cache_week ON public.lunch_menu_cache (week_key);

-- Enable RLS (public read, service-role write from edge function)
ALTER TABLE public.lunch_menu_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached menus
CREATE POLICY "Public can read lunch cache"
  ON public.lunch_menu_cache
  FOR SELECT
  USING (true);
