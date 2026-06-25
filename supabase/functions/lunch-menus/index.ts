import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Per-request flag: set to true when AI Gateway returns 402 (credits exhausted)
let aiCreditsExhausted = false;

function getTodayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Check if current time (Europe/Stockholm) is within allowed fetch window:
 *  weekdays (Mon-Fri), hours 08:00-13:59. */
function isWithinFetchWindow(date: Date): { allowed: boolean; reason?: string } {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const hour = parseInt(hourStr, 10);
  // sv-SE short weekday: mån, tis, ons, tors, fre, lör, sön
  const isWeekday = ['mån', 'tis', 'ons', 'tors', 'fre'].includes(weekday);
  if (!isWeekday) return { allowed: false, reason: 'Hämtning av menyer är endast tillåten på vardagar (mån–fre).' };
  if (hour < 8 || hour >= 14) return { allowed: false, reason: 'Hämtning av menyer är endast tillåten kl 08–14.' };
  return { allowed: true };
}

interface ScrapeResult {
  markdown: string | null;
  screenshot: string | null;
}

async function scrapeUrl(url: string, firecrawlKey: string): Promise<ScrapeResult> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'screenshot@fullPage'],
        onlyMainContent: true,
        waitFor: 5000,
        timeout: 30000,
      }),
    });
    if (!res.ok) {
      console.error(`Firecrawl error for ${url}: ${res.status}`);
      return { markdown: null, screenshot: null };
    }
    const data = await res.json();
    const markdown = data?.data?.markdown || data?.markdown || null;
    const screenshot = data?.data?.screenshot || data?.screenshot || null;
    return { markdown, screenshot };
  } catch (err) {
    console.error(`Scrape failed for ${url}:`, err);
    return { markdown: null, screenshot: null };
  }
}

function buildPrompt(name: string, todayStr: string): string {
  const dayNames = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  const dayAbbrevs = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
  const todayIdx = new Date(todayStr).getDay();
  const todayDay = dayNames[todayIdx];
  const todayAbbrev = dayAbbrevs[todayIdx];

  return `Du är en menyextraherare. Extrahera ALLA rätter som listas på menyn (huvudrätter, soppor, tillbehör, desserter, efterrätter etc.) som serveras IDAG (${todayDay} ${todayStr}) från innehållet för restaurangen "${name}".

IDAG ÄR: ${todayDay} (förkortat: ${todayAbbrev})

REGLER – läs ALLA innan du börjar:

1. VECKOMENY MED DAGAR (vanligast): Om menyn har en sektion per veckodag (t.ex. rubriker "Måndag", "Tisdag", … "Fredag" eller "MÅN", "TIS"…) → extrahera ENDAST rätterna under sektionen för ${todayDay}/${todayAbbrev}. ALLA andra dagars rätter ska IGNORERAS, även om de står först på sidan eller ser ut som "huvudrätter".

   Var EXTRA noga: hitta exakt rubriken som matchar "${todayDay}" eller "${todayAbbrev}" (skiftlägesokänsligt). Allt mellan den rubriken och NÄSTA dags rubrik tillhör idag. Inget annat.

2. VECKANS RÄTTER (endast om EXPLICIT markerat): Inkludera rätter som STÅR under rubrik "Veckans", "Hela veckan", "Alltid på menyn", eller på annat sätt explicit anges gälla hela veckan. Använd INTE denna regel som default — om det finns dagsrubriker, hör rätten till sin dag, inte hela veckan.

3. DAGSPECIFIKA RÄTTER: Inkludera rätter som explicit tillhör "${todayDay}" (t.ex. "${todayDay}: Pasta bolognese", eller under rubriken "${todayDay}").

4. DAGSINTERVALL: Inkludera rätter med ett dagsintervall som INKLUDERAR ${todayDay}. Exempel:
   - "Mån–Tis" inkluderar måndag och tisdag
   - "Ons–Tors" inkluderar onsdag och torsdag
   - "Mån–Ons" inkluderar måndag, tisdag, onsdag
   Kontrollera att ${todayDay} faktiskt ingår i intervallet.

5. CAESARSALLAD / STÅENDE RÄTTER: Om en rätt står utanför dagstrukturen (t.ex. efter veckans rätter men före dagarna) och inte har en dagsangivelse, räkna den som en veckans rätt.

6. UTESLUT rätter som tillhör ANDRA specifika veckodagar. Om det står "Tisdag: Fisk" och idag INTE är tisdag → hoppa över. Detta är den viktigaste regeln — fel dag = fel meny.

7. Inkludera ALLA rätter (som hör till idag enligt reglerna ovan) oavsett typ — soppor, pannkakor, efterrätter, tillbehör. Inkludera rättens namn OCH beskrivning/tillbehör som en sammanhängande text. Ignorera priser.

8. DAGSINFORMATION I NAMN (OBLIGATORISKT när rätten gäller fler dagar än bara idag):
   - Veckans rätter / "Alltid på menyn": prefix "(Hela veckan) " — t.ex. "(Hela veckan) Caesarsallad – kyckling"
   - Dagsintervall som inkluderar idag: prefix med exakt det intervall som står på menyn, t.ex. "(Ons–Tors) Fiskgryta – ris", "(Mån–Tis) Pasta – tomatsås"
   - Rätter som tydligt gäller flera enskilda dagar (t.ex. "Mån & Ons"): prefix "(Mån & Ons) ..."
   - Endast dagens rätt (gäller bara ${todayDay}): INGET prefix.
   Ta ALDRIG bort denna parentes om den hör till rätten — den är viktig information för användaren.

Svara ENBART med giltig JSON (inga kommentarer, ingen markdown):
{"dishes":[{"name":"(Hela veckan) Rättens namn – beskrivning/tillbehör","tags":["vegetarisk"]}]}

Taggar (bara om det TYDLIGT framgår): "vegetarisk", "vegansk", "fisk", "kött"
Om du inte hittar några rätter: {"dishes":[]}`;
}

async function extractMenuFromText(
  name: string,
  markdown: string,
  apiKey: string,
  todayStr: string,
  isPreFilteredForToday = false
): Promise<{ name: string; tags?: string[] }[]> {
  let prompt: string;
  if (isPreFilteredForToday) {
    prompt = `Du är en menyextraherare. Extrahera ALLA rätter (huvudrätter, soppor, tillbehör, desserter, efterrätter etc.) från innehållet för restaurangen "${name}".

VIKTIGT: Texten nedan innehåller ENBART dagens meny (redan filtrerad). Alla rätter gäller idag. Lägg INTE till prefix som "(Hela veckan)". Inkludera ALLA rätter oavsett typ – soppor, pannkakor, efterrätter och tillbehör ska också tas med.

Svara ENBART med giltig JSON (inga kommentarer, ingen markdown):
{"dishes":[{"name":"Rättens namn – beskrivning/tillbehör","tags":["vegetarisk"]}]}

Taggar (bara om det TYDLIGT framgår): "vegetarisk", "vegansk", "fisk", "kött"
Om du inte hittar några rätter: {"dishes":[]}

Text att analysera:
${markdown.slice(0, 15000)}`;
  } else {
    prompt = buildPrompt(name, todayStr) + `\n\nText att analysera:\n${markdown.slice(0, 15000)}`;
  }

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
      console.error(`AI text extraction failed for ${name}: ${res.status}`);
      if (res.status === 402) aiCreditsExhausted = true;
      return [];
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.dishes || [];
  } catch (err) {
    console.error(`AI text extraction error for ${name}:`, err);
    return [];
  }
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

async function extractMenuFromScreenshot(
  name: string,
  screenshotData: string,
  apiKey: string,
  todayStr: string
): Promise<{ name: string; tags?: string[] }[]> {
  const systemPrompt = buildPrompt(name, todayStr) + '\n\nAnalysera bilden/skärmbilden av restaurangens meny nedan.';

  let imageUrl: string;
  if (screenshotData.startsWith('data:')) {
    imageUrl = screenshotData;
  } else if (screenshotData.startsWith('http')) {
    // Firecrawl returns a URL, fetch and convert to base64
    const base64 = await fetchImageAsBase64(screenshotData);
    if (!base64) {
      console.error(`Failed to fetch screenshot for ${name}`);
      return [];
    }
    imageUrl = `data:image/png;base64,${base64}`;
  } else {
    imageUrl = `data:image/png;base64,${screenshotData}`;
  }

  try {
    const res = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        }],
        temperature: 0.1,
      }),
    });
    if (!res.ok) {
      console.error(`AI vision extraction failed for ${name}: ${res.status}`);
      if (res.status === 402) aiCreditsExhausted = true;
      return [];
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.dishes || [];
  } catch (err) {
    console.error(`AI vision extraction error for ${name}:`, err);
    return [];
  }
}

const MIN_MARKDOWN_LENGTH = 200;

async function fetchRssMenu(rssUrl: string, todayStr: string): Promise<string | null> {
  try {
    const res = await fetch(rssUrl);
    if (!res.ok) {
      console.error(`RSS fetch failed: ${res.status}`);
      return null;
    }
    const xml = await res.text();
    // Find the item matching today's date (format: DD-MM-YYYY in title)
    const [y, m, d] = todayStr.split('-');
    const rssDate = `${d}-${m}-${y}`;
    // Split items and find today's
    const items = xml.split('<item>');
    for (const item of items) {
      if (item.includes(rssDate)) {
        // Extract description content - may be CDATA or encoded HTML
        let desc = '';
        const cdataMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
        const plainMatch = item.match(/<description>([\s\S]*?)<\/description>/);
        if (cdataMatch) {
          desc = cdataMatch[1];
        } else if (plainMatch) {
          desc = plainMatch[1];
        }
        if (!desc) continue;

        const text = decodeRssHtml(desc);
        console.log(`RSS content for ${rssDate}: ${text.slice(0, 200)}...`);
        return text;
      }
    }
    console.log(`No RSS item found for ${rssDate}`);
    return null;
  } catch (err) {
    console.error('RSS fetch error:', err);
    return null;
  }
}

function decodeRssHtml(desc: string): string {
  return desc
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&auml;/g, 'ä').replace(/&Auml;/g, 'Ä')
    .replace(/&ouml;/g, 'ö').replace(/&Ouml;/g, 'Ö')
    .replace(/&aring;/g, 'å').replace(/&Aring;/g, 'Å')
    .replace(/&eacute;/g, 'é').replace(/&egrave;/g, 'è')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ldquo;/g, '"').replace(/&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fetch daily RSS feed (single item, no date matching needed) */
async function fetchRssDailyMenu(rssUrl: string): Promise<string | null> {
  try {
    const res = await fetch(rssUrl);
    if (!res.ok) {
      console.error(`RSS daily fetch failed: ${res.status}`);
      return null;
    }
    const xml = await res.text();
    // Daily feed should have one item with today's menu
    const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
    if (!itemMatch) {
      console.log('No item in daily RSS feed');
      return null;
    }
    const item = itemMatch[1];
    let desc = '';
    const cdataMatch = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
    const plainMatch = item.match(/<description>([\s\S]*?)<\/description>/);
    if (cdataMatch) desc = cdataMatch[1];
    else if (plainMatch) desc = plainMatch[1];
    if (!desc) return null;

    const text = decodeRssHtml(desc);
    if (text.length < 20) return null; // Too short = likely empty
    console.log(`RSS daily content: ${text.slice(0, 200)}...`);
    return text;
  } catch (err) {
    console.error('RSS daily fetch error:', err);
    return null;
  }
}

/** Fetch Compass Group JSON feed */
async function fetchJsonMenu(jsonUrl: string): Promise<string | null> {
  try {
    const res = await fetch(jsonUrl);
    if (!res.ok) {
      console.error(`JSON feed fetch failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    // Compass Group JSON: array of menu items or nested structure
    const text = JSON.stringify(data);
    if (!text || text === '[]' || text === '{}' || text.length < 30) return null;
    console.log(`JSON feed content (${text.length} chars): ${text.slice(0, 200)}...`);
    return text;
  } catch (err) {
    console.error('JSON feed fetch error:', err);
    return null;
  }
}

/** Derive Compass Group sibling URLs from the rss_url */
function getCompassGroupUrls(rssUrl: string): { dailyRss: string; jsonFeed: string; weeklyRss: string } | null {
  const match = rssUrl.match(/(https:\/\/www\.compass-group\.se\/menuapi\/feed\/).*\?(costNumber=\d+&language=\w+)/);
  if (!match) return null;
  const base = match[1];
  const params = match[2];
  return {
    dailyRss: `${base}rss/current-day?${params}`,
    jsonFeed: `${base}json?${params}`,
    weeklyRss: `${base}rss/current-week?${params}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse force and restaurantId parameters from body or query
    let force = false;
    let singleRestaurantId: string | null = null;
    // Reset per-request flag
    aiCreditsExhausted = false;
    try {
      const url = new URL(req.url);
      if (url.searchParams.get('force') === 'true') force = true;
      if (req.method === 'POST') {
        const body = await req.json().catch(() => null);
        if (body?.force) force = true;
        if (body?.restaurantId) singleRestaurantId = body.restaurantId;
      }
    } catch { /* ignore parse errors */ }

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

    const sortByName = (list: any[]) =>
      [...list].sort((a, b) =>
        String(a?.restaurantName ?? '').localeCompare(String(b?.restaurantName ?? ''), 'sv')
      );

    // Helper used by both cache-serve and scrape paths: for any active
    // restaurant missing from today's results, substitute yesterday's menu
    // (marked stale). Never reaches further back than 1 day.
    function yesterdayKeyOf(d: Date): string {
      const y = new Date(d);
      y.setDate(y.getDate() - 1);
      return getTodayKey(y);
    }
    const allowedPrevDatesGlobal = new Set<string>([todayKey, yesterdayKeyOf(now)]);

    async function fillMissingFromYesterday(menus: any[]): Promise<any[]> {
      const haveIds = new Set(menus.map((m: any) => m?.restaurantId));
      const { data: activeRest } = await supabase
        .from('restaurants')
        .select('id')
        .eq('active', true);
      const missingIds = (activeRest ?? [])
        .map((r: any) => r.id)
        .filter((id: string) => !haveIds.has(id));
      if (missingIds.length === 0) return menus;

      const { data: prevRows } = await supabase
        .from('lunch_menu_cache')
        .select('menu_data, created_at')
        .in('restaurant_id', missingIds)
        .order('created_at', { ascending: false })
        .limit(missingIds.length * 5);
      const latestPrev = new Map<string, any>();
      for (const row of (prevRows ?? []) as any[]) {
        const id = row.menu_data?.restaurantId;
        if (id && !latestPrev.has(id) && allowedPrevDatesGlobal.has(row.menu_data?.date)) {
          latestPrev.set(id, row.menu_data);
        }
      }
      return [...menus, ...Array.from(latestPrev.values())];
    }

    // Check cache for today
    const { data: cached, error: cacheError } = await supabase
      .from('lunch_menu_cache')
      .select('menu_data, created_at')
      .eq('week_key', todayKey);

    if (!cacheError && cached && cached.length > 0) {
      // Single restaurant refresh — bypass cooldown, re-scrape only one
      if (singleRestaurantId) {
        // Window check: only allow scraping on weekdays 08–14
        const window = isWithinFetchWindow(now);
        if (!window.allowed) {
          console.log(`Single refresh blocked – outside fetch window: ${window.reason}`);
          const menus = sortByName(cached.map((row: any) => row.menu_data));
          return new Response(
            JSON.stringify({ cooldown: true, minutesLeft: 0, reason: window.reason, menus }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Per-restaurant 1h cooldown
        const PER_REST_COOLDOWN_MS = 60 * 60 * 1000;
        const existing = cached.find((row: any) => (row.menu_data as any)?.restaurantId === singleRestaurantId);
        if (existing) {
          const ageMs = now.getTime() - new Date(existing.created_at).getTime();
          if (ageMs < PER_REST_COOLDOWN_MS) {
            const minutesLeft = Math.ceil((PER_REST_COOLDOWN_MS - ageMs) / 60000);
            console.log(`Per-restaurant refresh blocked for ${singleRestaurantId} – ${minutesLeft}min left`);
            const menus = sortByName(cached.map((row: any) => row.menu_data));
            return new Response(
              JSON.stringify({ cooldown: true, minutesLeft, menus }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        console.log(`Single restaurant refresh for ${singleRestaurantId}`);
      } else if (force) {
        // Window check: only allow scraping on weekdays 08–14
        const window = isWithinFetchWindow(now);
        if (!window.allowed) {
          console.log(`Force refresh blocked – outside fetch window: ${window.reason}`);
          const menus = sortByName(cached.map((row: any) => row.menu_data));
          return new Response(
            JSON.stringify({ cooldown: true, minutesLeft: 0, reason: window.reason, menus }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        // Check cooldown: only allow force refresh if cache is older than 30 minutes
        const COOLDOWN_MS = 30 * 60 * 1000;
        const newest = cached.reduce((a: any, b: any) =>
          new Date(a.created_at) > new Date(b.created_at) ? a : b
        );
        const ageMs = now.getTime() - new Date(newest.created_at).getTime();
        if (ageMs < COOLDOWN_MS) {
          const minutesLeft = Math.ceil((COOLDOWN_MS - ageMs) / 60000);
          console.log(`Force refresh blocked – cache is ${Math.floor(ageMs / 60000)}min old, cooldown ${minutesLeft}min left`);
          const menus = sortByName(cached.map((row: any) => row.menu_data));
          return new Response(JSON.stringify({ cooldown: true, minutesLeft, menus }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // Cooldown passed – clear cache and re-scrape
        console.log(`Force refresh allowed – cache is ${Math.floor(ageMs / 60000)}min old`);
        await supabase.from('lunch_menu_cache').delete().eq('week_key', todayKey);
      } else {
        // Normal request – serve from cache
        console.log(`Serving ${cached.length} menus from cache for ${todayKey}`);
        const todaysMenus = cached.map((row: any) => row.menu_data);
        const filled = await fillMissingFromYesterday(todaysMenus);
        const stamped = filled.map((m: any) => ({ ...m, stale: m?.date !== todayKey }));
        return new Response(JSON.stringify({ menus: sortByName(stamped) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else if (force || singleRestaurantId) {
      // No cache yet — still enforce window for any scrape attempt
      const window = isWithinFetchWindow(now);
      if (!window.allowed) {
        console.log(`Refresh blocked – outside fetch window: ${window.reason}`);
        return new Response(
          JSON.stringify({ cooldown: true, minutesLeft: 0, reason: window.reason, menus: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Force refresh – no existing cache to check cooldown against`);
    } else {
      // Normal request with no cache: only scrape inside the fetch window
      const window = isWithinFetchWindow(now);
      if (!window.allowed) {
        console.log(`Initial scrape blocked – outside fetch window: ${window.reason}`);
        return new Response(
          JSON.stringify({ menus: [], reason: window.reason }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch restaurants from DB
    let restaurantQuery = supabase
      .from('restaurants')
      .select('*')
      .eq('active', true);
    
    if (singleRestaurantId) {
      restaurantQuery = restaurantQuery.eq('id', singleRestaurantId);
    }

    const { data: restaurants, error: restError } = await restaurantQuery.order('name');

    if (restError || !restaurants?.length) {
      console.error('Failed to load restaurants:', restError);
      return new Response(JSON.stringify({ menus: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Scraping ${restaurants.length} restaurant(s)...`);

    // Pre-load the latest cached menu_data per restaurant across ALL days.
    // Used as fallback when a fresh scrape yields no dishes — we keep the
    // previous day's data (with its original updatedAt) and mark it stale.
    const latestByRestaurant = new Map<string, any>();
    {
      const { data: allCache } = await supabase
        .from('lunch_menu_cache')
        .select('menu_data, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (allCache) {
        for (const row of allCache as any[]) {
          const id = row.menu_data?.restaurantId;
          if (id && !latestByRestaurant.has(id)) {
            latestByRestaurant.set(id, row.menu_data);
          }
        }
      }
    }

    // Only substitute from "yesterday or today" — never older. The user
    // explicitly does not want stale messages pointing to data from days ago.
    function yesterdayKey(d: Date): string {
      const y = new Date(d);
      y.setDate(y.getDate() - 1);
      return getTodayKey(y);
    }
    const allowedPrevDates = new Set<string>([todayKey, yesterdayKey(now)]);

    const BATCH_SIZE = 4;
    const allMenus: unknown[] = [];

    for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
      const batch = restaurants.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (r: any) => {
          let dishes: { name: string; tags?: string[] }[] = [];

          // Try Compass Group cascade: daily RSS → JSON → weekly RSS
          const compassUrls = r.rss_url ? getCompassGroupUrls(r.rss_url) : null;
          if (compassUrls) {
            // 1. Daily RSS (pre-filtered for today)
            const dailyText = await fetchRssDailyMenu(compassUrls.dailyRss);
            if (dailyText) {
              console.log(`Using daily RSS for ${r.name}`);
              dishes = await extractMenuFromText(r.name, dailyText, lovableKey, todayKey, true);
            }
            // 2. JSON feed
            if (dishes.length === 0) {
              const jsonText = await fetchJsonMenu(compassUrls.jsonFeed);
              if (jsonText) {
                console.log(`Using JSON feed for ${r.name}`);
                dishes = await extractMenuFromText(r.name, jsonText, lovableKey, todayKey, true);
              }
            }
            // 3. Weekly RSS (need to extract today only)
            if (dishes.length === 0) {
              const weeklyText = await fetchRssMenu(compassUrls.weeklyRss, todayKey);
              if (weeklyText) {
                console.log(`Using weekly RSS for ${r.name}`);
                dishes = await extractMenuFromText(r.name, weeklyText, lovableKey, todayKey, true);
              }
            }
          } else if (r.rss_url) {
            // Generic RSS feed
            const rssText = await fetchRssMenu(r.rss_url, todayKey);
            if (rssText) {
              console.log(`Using RSS feed for ${r.name}`);
              dishes = await extractMenuFromText(r.name, rssText, lovableKey, todayKey, true);
            }
          }

          // Fall back to Firecrawl scraping
          if (dishes.length === 0) {
            const { markdown, screenshot } = await scrapeUrl(r.menu_url, firecrawlKey);

            if (markdown && markdown.length >= MIN_MARKDOWN_LENGTH) {
              dishes = await extractMenuFromText(r.name, markdown, lovableKey, todayKey);
            }

            if (dishes.length === 0 && screenshot) {
              console.log(`Falling back to vision for ${r.name}`);
              dishes = await extractMenuFromScreenshot(r.name, screenshot, lovableKey, todayKey);
            }

            if (dishes.length === 0 && !markdown && !screenshot) {
              console.log(`No content scraped for ${r.name}`);
            }
          }

          // If the scrape produced no dishes, keep the last known menu for this
          // restaurant (don't bump updatedAt). The response layer will mark it
          // as stale if its date != today.
          if (dishes.length === 0) {
            const prev = latestByRestaurant.get(r.id);
            if (prev && allowedPrevDates.has(prev.date)) {
              return { ...prev, _substituted: true };
            }
          }
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

    // Store in cache
    // Only cache menus that actually got dishes — don't overwrite good cache with empty
    // results caused by AI failures (e.g. 402 credits exhausted).
    const rowsToCache = (allMenus as any[])
      .filter((menu: any) => menu.dishes.length > 0 && !menu._substituted && menu.date === todayKey)
      .map((menu: any) => ({
        week_key: todayKey,
        restaurant_id: menu.restaurantId,
        menu_data: menu,
      }));

    if (rowsToCache.length > 0) {
      const { error: insertError } = await supabase
        .from('lunch_menu_cache')
        .upsert(rowsToCache, { onConflict: 'week_key,restaurant_id' });
      if (insertError) {
        console.error('Cache insert error:', insertError);
      } else {
        console.log(`Cached ${rowsToCache.length} menus for ${todayKey}`);
      }
    } else {
      console.log(`Skipping cache write — 0 menus had dishes (aiCreditsExhausted=${aiCreditsExhausted})`);
    }

    // Helper: stamp `stale` if the menu's date doesn't match today.
    const withStale = (list: any[]) =>
      list.map((m: any) => {
        const { _substituted, ...rest } = m ?? {};
        return { ...rest, stale: rest?.date !== todayKey };
      });

    // If single restaurant refresh, merge with existing cached menus and return full list
    if (singleRestaurantId && cached && cached.length > 0) {
      const updatedIds = new Set(allMenus.map((m: any) => m.restaurantId));
      const existingMenus = cached
        .filter((row: any) => !updatedIds.has(row.menu_data.restaurantId))
        .map((row: any) => row.menu_data);
      const merged = [...existingMenus, ...allMenus];
      console.log(`Merged: ${allMenus.length} refreshed + ${existingMenus.length} cached = ${merged.length} total`);
      return new Response(JSON.stringify({ menus: sortByName(withStale(merged)), aiCreditsExhausted }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Done. Got menus for ${(allMenus as any[]).filter((m: any) => m.dishes.length > 0).length}/${restaurants.length} restaurants.`);

    return new Response(JSON.stringify({ menus: sortByName(withStale(allMenus as any[])), aiCreditsExhausted }), {
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
