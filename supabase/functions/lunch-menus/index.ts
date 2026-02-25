import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface RestaurantInput {
  id: string;
  name: string;
  websiteUrl: string;
  menuUrl: string;
  address?: string;
}

const RESTAURANTS: RestaurantInput[] = [
  { id: '1', name: 'Bistrot', websiteUrl: 'https://bistrot.se/', menuUrl: 'https://bistrot.se/' },
  { id: '2', name: 'Bombay Bistro', websiteUrl: 'https://www.bombaybistro.se/', menuUrl: 'https://www.bombaybistro.se/lunch/' },
  { id: '3', name: "Cuckoo's Nest", websiteUrl: 'https://www.cuckoosnest.se/', menuUrl: 'https://www.cuckoosnest.se/menyer/lunch' },
  { id: '4', name: 'District One', websiteUrl: 'https://www.districtone.se/', menuUrl: 'https://www.districtone.se/lunch.html' },
  { id: '5', name: 'Kooperativet', websiteUrl: 'https://www.kooperativet.se/', menuUrl: 'https://www.kooperativet.se/' },
  { id: '6', name: 'Masala Street Kitchen', websiteUrl: 'https://masalakitchen.se/', menuUrl: 'https://masalakitchen.se/lunch/' },
  { id: '7', name: 'Pier11', websiteUrl: 'https://ericssonbynordrest.se/restaurang/restaurant-pier-11/', menuUrl: 'https://ericssonbynordrest.se/restaurang/restaurant-pier-11/' },
  { id: '8', name: 'Uni3 - World of Food', websiteUrl: 'https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/uni3-world-of-food/', menuUrl: 'https://www.compass-group.se/restauranger-och-menyer/ovriga-restauranger/uni3-world-of-food/' },
];

// Get ISO week key like "2026-W09"
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
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

interface ExtractedDish {
  name: string;
  tags?: string[];
}

async function extractMenuWithAI(
  restaurant: RestaurantInput,
  markdown: string,
  apiKey: string,
  todayStr: string
): Promise<ExtractedDish[]> {
  const prompt = `Du är en menyextraherare. Extrahera VECKANS lunchrätter från denna text för restaurangen "${restaurant.name}".

Dagens datum: ${todayStr}

Svara ENBART med giltig JSON i detta format (inga kommentarer, ingen markdown):
{"dishes":[{"name":"Rättens namn","tags":["vegetarisk"]}]}

Taggar att använda (bara om det tydligt framgår): "vegetarisk", "vegansk", "fisk", "kött"
Om du inte hittar några rätter, svara: {"dishes":[]}

Text att analysera:
${markdown.slice(0, 6000)}`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });
    if (!res.ok) {
      console.error(`AI extraction failed for ${restaurant.name}: ${res.status}`);
      return [];
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.dishes || [];
  } catch (err) {
    console.error(`AI extraction error for ${restaurant.name}:`, err);
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
    const weekKey = getWeekKey(now);

    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('lunch_menu_cache')
      .select('menu_data')
      .eq('week_key', weekKey);

    if (!cacheError && cached && cached.length > 0) {
      console.log(`Serving ${cached.length} menus from cache for ${weekKey}`);
      const menus = cached.map((row: { menu_data: unknown }) => row.menu_data);
      return new Response(JSON.stringify(menus), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No cache – scrape all restaurants
    console.log(`No cache for ${weekKey}. Scraping ${RESTAURANTS.length} restaurants...`);
    const todayStr = now.toISOString().split('T')[0];
    const BATCH_SIZE = 4;
    const allMenus: unknown[] = [];

    for (let i = 0; i < RESTAURANTS.length; i += BATCH_SIZE) {
      const batch = RESTAURANTS.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (r) => {
          const markdown = await scrapeUrl(r.menuUrl, firecrawlKey);
          if (!markdown) {
            console.log(`No content scraped for ${r.name}`);
            return {
              restaurantId: r.id,
              restaurantName: r.name,
              websiteUrl: r.websiteUrl,
              date: todayStr,
              dishes: [],
              sourceUrl: r.menuUrl,
              updatedAt: now.toISOString(),
            };
          }
          const dishes = await extractMenuWithAI(r, markdown, lovableKey, todayStr);
          return {
            restaurantId: r.id,
            restaurantName: r.name,
            websiteUrl: r.websiteUrl,
            date: todayStr,
            dishes,
            sourceUrl: r.menuUrl,
            updatedAt: now.toISOString(),
          };
        })
      );
      allMenus.push(...results);
    }

    // Store in cache
    const rows = allMenus.map((menu: any) => ({
      week_key: weekKey,
      restaurant_id: menu.restaurantId,
      menu_data: menu,
    }));

    const { error: insertError } = await supabase
      .from('lunch_menu_cache')
      .upsert(rows, { onConflict: 'week_key,restaurant_id' });

    if (insertError) {
      console.error('Cache insert error:', insertError);
    } else {
      console.log(`Cached ${rows.length} menus for ${weekKey}`);
    }

    console.log(`Done. Got menus for ${(allMenus as any[]).filter((m: any) => m.dishes.length > 0).length}/${RESTAURANTS.length} restaurants.`);

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
