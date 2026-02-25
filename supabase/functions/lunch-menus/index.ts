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
  address?: string;
  menuUrl?: string;
}

// Restaurants on Lindholmen with their menu URLs
const RESTAURANTS: RestaurantInput[] = [
  { id: '1', name: 'Benne Pasta Bar', websiteUrl: 'https://bennepastabar.se', address: 'Lindholmsallén 10, Göteborg', menuUrl: 'https://bennepastabar.se' },
  { id: '2', name: 'Bistrot', websiteUrl: 'https://bistrot.se', address: 'Diagonalen 8, Göteborg', menuUrl: 'https://bistrot.se' },
  { id: '3', name: 'Bombay Bistro', websiteUrl: 'https://bombaybistrot.se', address: 'Lindholmspiren 3, Göteborg', menuUrl: 'https://bombaybistrot.se' },
  { id: '4', name: 'Caffè la Torre', websiteUrl: 'https://www.lindholmen.se/en/caffe-la-torre', address: 'Lindholmshamnen 42, Göteborg' },
  { id: '5', name: 'Dunder Döner', websiteUrl: 'https://www.lindholmen.se/en/dunder-doner', address: 'Lindholmspiren 3, Göteborg' },
  { id: '6', name: 'Kooperativet', websiteUrl: 'https://kooperativet.se', address: 'Lindholmsallén 10, Göteborg', menuUrl: 'https://kooperativet.se' },
  { id: '7', name: 'Mimolett', websiteUrl: 'https://mimolett.se', address: 'Lindholmsallén 10, Göteborg', menuUrl: 'https://mimolett.se' },
  { id: '8', name: 'Piazzarella', websiteUrl: 'https://www.lindholmen.se/en/piazzarella', address: 'Lindholmspiren 3, Göteborg' },
  { id: '9', name: 'Pier 11', websiteUrl: 'https://pier11.se', address: 'Lindholmspiren 11, Göteborg', menuUrl: 'https://pier11.se' },
  { id: '10', name: 'Subway Lindholmen', websiteUrl: 'https://subway.se', address: 'Lindholmspiren 3, Göteborg' },
  { id: '11', name: 'Tai', websiteUrl: 'https://www.facebook.com/TaiLindholmen', address: 'Lindholmspiren 3, Göteborg' },
  { id: '12', name: 'Tandoori Masala', websiteUrl: 'https://tandoorimasala.se', address: 'Lindholmspiren 3, Göteborg', menuUrl: 'https://tandoorimasala.se' },
  { id: '13', name: 'Uni3', websiteUrl: 'https://uni3.se', address: 'Lindholmspiren 5, Göteborg', menuUrl: 'https://uni3.se' },
];

async function scrapeUrl(url: string, firecrawlKey: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!res.ok) {
      console.error(`Firecrawl error for ${url}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const markdown = data?.data?.markdown || data?.markdown || null;
    return markdown;
  } catch (err) {
    console.error(`Scrape failed for ${url}:`, err);
    return null;
  }
}

interface ExtractedDish {
  name: string;
  tags?: string[];
}

interface ExtractedMenu {
  restaurantId: string;
  dishes: ExtractedDish[];
}

async function extractMenuWithAI(
  restaurant: RestaurantInput,
  markdown: string,
  apiKey: string,
  todayStr: string
): Promise<ExtractedMenu> {
  const prompt = `Du är en menyextraherare. Extrahera dagens lunchrätter från denna text för restaurangen "${restaurant.name}".

Dagens datum: ${todayStr}

Svara ENBART med giltig JSON i detta format (inga kommentarer, ingen markdown):
{"dishes":[{"name":"Rättens namn","tags":["vegetarisk"]}]}

Taggar att använda (bara om det tydligt framgår): "vegetarisk", "vegansk", "fisk", "kött"
Om du inte hittar några rätter, svara: {"dishes":[]}

Text att analysera:
${markdown.slice(0, 4000)}`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      console.error(`AI extraction failed for ${restaurant.name}: ${res.status}`);
      return { restaurantId: restaurant.id, dishes: [] };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`No JSON found in AI response for ${restaurant.name}`);
      return { restaurantId: restaurant.id, dishes: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      restaurantId: restaurant.id,
      dishes: parsed.dishes || [],
    };
  } catch (err) {
    console.error(`AI extraction error for ${restaurant.name}:`, err);
    return { restaurantId: restaurant.id, dishes: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: { code: 'CONFIG_ERROR', message: 'FIRECRAWL_API_KEY not configured' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return new Response(
        JSON.stringify({ error: { code: 'CONFIG_ERROR', message: 'LOVABLE_API_KEY not configured' } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse optional restaurantId filter from query
    const url = new URL(req.url);
    const filterIds = url.searchParams.get('ids')?.split(',').filter(Boolean);

    const restaurants = filterIds
      ? RESTAURANTS.filter((r) => filterIds.includes(r.id))
      : RESTAURANTS;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    console.log(`Scraping menus for ${restaurants.length} restaurants...`);

    // Scrape all restaurants in parallel (batched to avoid rate limits)
    const BATCH_SIZE = 5;
    const allMenus: {
      restaurantId: string;
      restaurantName: string;
      websiteUrl: string;
      address?: string;
      date: string;
      dishes: ExtractedDish[];
      sourceUrl: string;
      updatedAt: string;
    }[] = [];

    for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
      const batch = restaurants.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (r) => {
          const scrapeTarget = r.menuUrl || r.websiteUrl;
          const markdown = await scrapeUrl(scrapeTarget, firecrawlKey);

          if (!markdown) {
            console.log(`No content scraped for ${r.name}`);
            return {
              restaurantId: r.id,
              restaurantName: r.name,
              websiteUrl: r.websiteUrl,
              address: r.address,
              date: todayStr,
              dishes: [] as ExtractedDish[],
              sourceUrl: scrapeTarget,
              updatedAt: now.toISOString(),
            };
          }

          const extracted = await extractMenuWithAI(r, markdown, lovableKey, todayStr);

          return {
            restaurantId: r.id,
            restaurantName: r.name,
            websiteUrl: r.websiteUrl,
            address: r.address,
            date: todayStr,
            dishes: extracted.dishes,
            sourceUrl: scrapeTarget,
            updatedAt: now.toISOString(),
          };
        })
      );

      allMenus.push(...results);
    }

    console.log(`Done. Got menus for ${allMenus.filter((m) => m.dishes.length > 0).length}/${restaurants.length} restaurants.`);

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
