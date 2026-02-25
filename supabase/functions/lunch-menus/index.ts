import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

function getTodayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function scrapeUrl(url: string, firecrawlKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, waitFor: 3000 }),
    });
    if (!res.ok) {
      console.error(`Firecrawl error for ${url}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data?.data?.markdown || data?.markdown || null;
  } catch (err) {
    console.error(`Scrape failed for ${url}:`, err);
    return null;
  }
}

async function extractMenuWithAI(
  name: string,
  markdown: string,
  apiKey: string,
  todayStr: string
): Promise<{ name: string; tags?: string[] }[]> {
  const dayNames = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  const dayAbbrevs = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
  const todayIdx = new Date(todayStr).getDay();
  const todayDay = dayNames[todayIdx];
  const todayAbbrev = dayAbbrevs[todayIdx];

  const prompt = `Du är en menyextraherare. Extrahera ENBART lunchrätter som serveras IDAG (${todayDay} ${todayStr}) från denna text för restaurangen "${name}".

IDAG ÄR: ${todayDay} (förkortat: ${todayAbbrev})

REGLER – läs ALLA innan du börjar:

1. VECKANS RÄTTER: Inkludera rätter markerade som "Veckans", "Hela veckan", "Alltid på menyn", eller rätter utan dagsangivelse som uppenbart gäller hela veckan. Dessa serveras VARJE dag.

2. DAGSPECIFIKA RÄTTER: Inkludera rätter som explicit tillhör "${todayDay}" (t.ex. "${todayDay}: Pasta bolognese", eller under rubriken "${todayDay}").

3. DAGSINTERVALL: Inkludera rätter med ett dagsintervall som INKLUDERAR ${todayDay}. Exempel:
   - "Mån–Tis" inkluderar måndag och tisdag
   - "Ons–Tors" inkluderar onsdag och torsdag
   - "Mån–Ons" inkluderar måndag, tisdag, onsdag
   Kontrollera att ${todayDay} faktiskt ingår i intervallet.

4. CAESARSALLAD / STÅENDE RÄTTER: Om en rätt står utanför dagstrukturen (t.ex. efter veckans rätter men före dagarna) och inte har en dagsangivelse, räkna den som en veckans rätt.

5. UTESLUT rätter som tillhör ANDRA specifika veckodagar. Om det står "Tisdag: Fisk" och idag INTE är tisdag → hoppa över.

6. Inkludera rättens namn OCH beskrivning/tillbehör som en sammanhängande text. Ignorera priser.

7. DAGSINFORMATION I NAMN: Skriv ut vilka dagar rätten gäller som prefix i namnet:
   - Veckans rätter: "(Hela veckan) Rättnamn – tillbehör"
   - Dagsintervall: "(Mån–Tis) Rättnamn – tillbehör"
   - Enbart dagens rätt: Inget prefix behövs, det är underförstått att den gäller idag.

Svara ENBART med giltig JSON (inga kommentarer, ingen markdown):
{"dishes":[{"name":"(Hela veckan) Rättens namn – beskrivning/tillbehör","tags":["vegetarisk"]}]}

Taggar (bara om det TYDLIGT framgår): "vegetarisk", "vegansk", "fisk", "kött"
Om du inte hittar några rätter: {"dishes":[]}

Text att analysera:
${markdown.slice(0, 8000)}`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });
    if (!res.ok) {
      console.error(`AI extraction failed for ${name}: ${res.status}`);
      return [];
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.dishes || [];
  } catch (err) {
    console.error(`AI extraction error for ${name}:`, err);
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!firecrawlKey || !lovableKey || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: { code: 'CONFIG_ERROR', message: 'Missing required environment variables' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date();
    const todayKey = getTodayKey(now);

    // Check cache for today
    const { data: cached, error: cacheError } = await supabase
      .from('lunch_menu_cache')
      .select('menu_data')
      .eq('week_key', todayKey);

    if (!cacheError && cached && cached.length > 0) {
      console.log(`Serving ${cached.length} menus from cache for ${todayKey}`);
      const menus = cached.map((row: { menu_data: unknown }) => row.menu_data);
      return new Response(JSON.stringify(menus), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch restaurants from DB
    const { data: restaurants, error: restError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('active', true)
      .order('name');

    if (restError || !restaurants?.length) {
      console.error('Failed to load restaurants:', restError);
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`No cache for ${todayKey}. Scraping ${restaurants.length} restaurants...`);

    const BATCH_SIZE = 4;
    const allMenus: unknown[] = [];

    for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
      const batch = restaurants.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (r: any) => {
          const markdown = await scrapeUrl(r.menu_url, firecrawlKey);
          if (!markdown) {
            console.log(`No content scraped for ${r.name}`);
            return {
              restaurantId: r.id,
              restaurantName: r.name,
              websiteUrl: r.website_url,
              date: todayKey,
              dishes: [],
              sourceUrl: r.menu_url,
              updatedAt: now.toISOString(),
            };
          }
          const dishes = await extractMenuWithAI(r.name, markdown, lovableKey, todayKey);
          return {
            restaurantId: r.id,
            restaurantName: r.name,
            websiteUrl: r.website_url,
            date: todayKey,
            dishes,
            sourceUrl: r.menu_url,
            updatedAt: now.toISOString(),
          };
        })
      );
      allMenus.push(...results);
    }

    // Store in cache using today's date as key
    const rows = allMenus.map((menu: any) => ({
      week_key: todayKey,
      restaurant_id: menu.restaurantId,
      menu_data: menu,
    }));

    const { error: insertError } = await supabase
      .from('lunch_menu_cache')
      .upsert(rows, { onConflict: 'week_key,restaurant_id' });

    if (insertError) {
      console.error('Cache insert error:', insertError);
    } else {
      console.log(`Cached ${rows.length} menus for ${todayKey}`);
    }

    console.log(`Done. Got menus for ${(allMenus as any[]).filter((m: any) => m.dishes.length > 0).length}/${restaurants.length} restaurants.`);

    return new Response(JSON.stringify(allMenus), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in lunch-menus:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: { code: 'INTERNAL_ERROR', message } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
