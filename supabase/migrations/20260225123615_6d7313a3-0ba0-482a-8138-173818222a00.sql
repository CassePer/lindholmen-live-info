
-- Restaurants table for admin management
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website_url text NOT NULL,
  menu_url text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read restaurants"
  ON public.restaurants FOR SELECT
  USING (true);

-- Only service role can insert/update/delete (via edge function)
-- No authenticated user policies needed since admin is unprotected for now

-- Seed with the 8 current restaurants
INSERT INTO public.restaurants (name, website_url, menu_url) VALUES
  ('Bistrot', 'https://bistrot.se/', 'https://bistrot.se/'),
  ('Bombay Bistro', 'https://www.bombaybistro.se/', 'https://www.bombaybistro.se/lunch/'),
  ('Cuckoo''s Nest', 'https://www.cuckoosnest.se/', 'https://www.cuckoosnest.se/menyer/lunch'),
  ('District One', 'https://www.districtone.se/', 'https://www.districtone.se/lunch.html'),
  ('Kooperativet', 'https://www.kooperativet.se/', 'https://www.kooperativet.se/'),
  ('Masala Street Kitchen', 'https://masalakitchen.se/', 'https://masalakitchen.se/lunch/'),
  ('Pier11', 'https://ericssonbynordrest.se/restaurang/restaurant-pier-11/', 'https://ericssonbynordrest.se/restaurang/restaurant-pier-11/'),
  ('Uni3 - World of Food', 'https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/uni3-world-of-food/', 'https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/uni3-world-of-food/');
