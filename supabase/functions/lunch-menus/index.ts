import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';

// Per-request flag: set to true when AI Gateway returns 402 (credits exhausted)
let aiCreditsExhausted = false;

/** Date key (YYYY-MM-DD) for the given instant in Europe/Stockholm.
 *  The Deno runtime is UTC, so plain local getters would be up to 2h behind
 *  and roll the day over too late (menus landing on the wrong weekday). */
function getTodayKey(date: Date): string {
  // sv-SE formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Stable UTC-noon anchor for a date key, safe for +/- day arithmetic. */
function anchorFromKey(key: string): Date {
  return new Date(`${key}T12:00:00Z`);
}

/** Stockholm-anchored copy of an instant; UTC getters on it match Stockholm's date. */
function stockholmAnchor(date: Date): Date {
  return anchorFromKey(getTodayKey(date));
}

/** Weekday index (0=Sun..6=Sat) of the instant in Europe/Stockholm. */
function stockholmDayIndex(date: Date): number {
  return stockholmAnchor(date).getUTCDay();
}

/** Shift a date key by N days. */
function shiftKey(key: string, days: number): string {
  const d = anchorFromKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return getTodayKey(d);
}

/** Date key (YYYY-MM-DD) for the Monday of the given date's ISO week. */
function mondayKeyOf(date: Date): string {
  const day = stockholmDayIndex(date); // 0=Sun, 1=Mon, ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return shiftKey(getTodayKey(date), diff);
}

const DAY_KEYS_BY_INDEX = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
type DayKey = typeof DAY_KEYS_BY_INDEX[number];
function todayDayKey(date: Date): DayKey {
  return DAY_KEYS_BY_INDEX[stockholmDayIndex(date)];
}

interface WeeklyMenuRaw {
  restaurantId: string;
  restaurantName: string;
  websiteUrl: string;
  sourceUrl?: string;
  weekly: true;
  weekStart: string;
  dishesByDay: Partial<Record<DayKey | 'week', { name: string; tags?: string[] }[]>>;
  updatedAt: string;
}

/** Convert a weekly cached menu into the normal single-day menu shape used by the UI. */
function weeklyToDayMenu(raw: WeeklyMenuRaw, dk: DayKey, dateKey: string) {
  const byDay = raw?.dishesByDay ?? {};
  const todays = Array.isArray(byDay[dk]) ? byDay[dk]! : [];
  const weekList = Array.isArray(byDay.week) ? byDay.week! : [];
  const weekPrefixed = weekList.map((d) => ({
    ...d,
    name: d?.name?.startsWith('(') ? d.name : `(Hela veckan) ${d.name}`,
  }));
  return {
    restaurantId: raw.restaurantId,
    restaurantName: raw.restaurantName,
    websiteUrl: raw.websiteUrl,
    sourceUrl: raw.sourceUrl,
    date: dateKey,
    dishes: [...todays, ...weekPrefixed],
    updatedAt: raw.updatedAt,
    weekly: true,
    weekStart: raw.weekStart,
  };
}

/** Today's projection of a weekly menu. */
function weeklyToTodayMenu(raw: WeeklyMenuRaw, now: Date, todayKey: string) {
  return weeklyToDayMenu(raw, todayDayKey(now), todayKey);
}

/** Check if current time (Europe/Stockholm) is within allowed fetch window:
 *  weekdays (Mon-Fri), configurable hours [startHour, endHour). */
function isWithinFetchWindow(
  date: Date,
  startHour = 6,
  endHour = 14,
  windowDisabled = false,
): { allowed: boolean; reason?: string } {
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
  if (!windowDisabled && (hour < startHour || hour >= endHour)) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      allowed: false,
      reason: `Hämtning av menyer är endast tillåten kl ${pad(startHour)}–${pad(endHour)}.`,
    };
  }
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
        onlyMainContent: false,
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

/** Direct HTML fetch → plain text. Works for server-rendered menu pages. */
async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; LindholmenLunchBot/1.0; +https://lindholmen-live-info.lovable.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) {
      console.error(`Direct fetch failed for ${url}: ${res.status}`);
      return null;
    }
    const html = await res.text();
    const text = html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/[ \t\u00a0]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
    return text.length > 0 ? text : null;
  } catch (err) {
    console.error(`Direct fetch error for ${url}:`, err);
    return null;
  }
}

/**
 * Collect candidate page texts. Direct HTML fetch is tried first (it keeps the
 * full menu markup for server-rendered pages), Firecrawl markdown second
 * (needed for JS-rendered pages). The screenshot powers the vision fallback.
 */
async function collectPageContent(
  url: string,
  firecrawlKey: string,
): Promise<{
  candidates: { text: string; source: 'direct' | 'firecrawl' }[];
  screenshot: string | null;
}> {
  const [direct, scraped] = await Promise.all([
    fetchPageText(url),
    scrapeUrl(url, firecrawlKey),
  ]);
  const candidates: { text: string; source: 'direct' | 'firecrawl' }[] = [];
  if (direct && direct.length >= MIN_MARKDOWN_LENGTH) {
    candidates.push({ text: direct, source: 'direct' });
  }
  if (scraped.markdown && scraped.markdown.length >= MIN_MARKDOWN_LENGTH) {
    candidates.push({ text: scraped.markdown, source: 'firecrawl' });
  }
  return { candidates, screenshot: scraped.screenshot };
}



function buildPrompt(name: string, todayStr: string): string {
  const dayNames = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  const dayAbbrevs = ['sön', 'mån', 'tis', 'ons', 'tors', 'fre', 'lör'];
  const todayIdx = anchorFromKey(todayStr).getUTCDay();
  const todayDay = dayNames[todayIdx];
  const todayAbbrev = dayAbbrevs[todayIdx];

  return `Du är en menyextraherare. Extrahera ALLA rätter som listas på menyn (huvudrätter, soppor, tillbehör, desserter, efterrätter etc.) som serveras IDAG (${todayDay} ${todayStr}) från innehållet för restaurangen "${name}".

IDAG ÄR: ${todayDay} (förkortat: ${todayAbbrev})
${buildWeekScopeRules(todayStr)}

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
    return dedupeDishes(parsed.dishes || []);
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
    return dedupeDishes(parsed.dishes || []);
  } catch (err) {
    console.error(`AI vision extraction error for ${name}:`, err);
    return [];
  }
}

const MIN_MARKDOWN_LENGTH = 200;

/** ISO week number for a date. */
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Rules that force the model to only read the CURRENT week's section. */
function buildWeekScopeRules(todayStr: string): string {
  const today = anchorFromKey(todayStr);
  const week = isoWeekNumber(today);
  const day = today.getUTCDay();
  const mondayStr = shiftKey(todayStr, day === 0 ? -6 : 1 - day);
  const sundayStr = shiftKey(mondayStr, 6);
  const fmt = (s: string) => s;
  const monday = mondayStr;
  const sunday = sundayStr;

  return `
AKTUELL VECKA: vecka ${week} (${fmt(monday)} – ${fmt(sunday)}). Dagens datum är ${todayStr}.

VECKOSCOPING – VIKTIGAST AV ALLT:
- Sidan kan innehålla FLERA veckor samtidigt (t.ex. "Vecka ${week}" och "Vecka ${week + 1}", "Nästa vecka", eller datumintervall/flikar).
- Använd ENDAST innehållet i sektionen för vecka ${week} eller den sektion vars datumintervall innehåller ${todayStr}.
- Allt under andra vecko-rubriker ska IGNORERAS HELT, även om veckodagen matchar dagens veckodag.
- Står ett exakt datum vid veckodagen: matcha i första hand på datumet ${todayStr}, i andra hand på veckodagens namn.
- Varje rätt får bara förekomma EN gång i svaret – inga dubbletter.`;
}

/** Remove duplicate dishes (case/whitespace/punctuation-insensitive), keeping order. */
function dedupeDishes<T extends { name?: string }>(dishes: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const d of dishes ?? []) {
    const key = (d?.name ?? '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

function buildWeekPrompt(name: string, todayStr: string): string {
  return `Du är en menyextraherare. Restaurangen "${name}" publicerar HELA veckans meny på måndagen. Extrahera ALLA rätter strukturerat per veckodag (mån–fre).
${buildWeekScopeRules(todayStr)}

Svara ENBART med giltig JSON (inga kommentarer, ingen markdown), exakt detta schema:
{
  "dishesByDay": {
    "mon": [{"name": "Rättens namn – beskrivning", "tags": ["vegetarisk"]}],
    "tue": [],
    "wed": [],
    "thu": [],
    "fri": [],
    "week": []
  }
}

REGLER:
1. Lägg varje rätt under sin veckodag (mon/tue/wed/thu/fri). Ta med ALLA rätter den dagen – huvudrätter, soppor, tillbehör, efterrätter, vegetariska alternativ.
2. INGET dagsprefix i namnet under "mon"/"tue"/… – strukturen anger redan dagen.
3. "week"-listan ska INNEHÅLLA rätter som tydligt gäller HELA VECKAN (rubriker som "Veckans soppa", "Veckans sallad", "Alltid på menyn", "Hela veckan"). Lägg INTE in dagsspecifika rätter där.
4. Dagsintervall (t.ex. "Ons–Tors: Fiskgryta"): duplicera rätten i VARJE veckodag som ingår i intervallet ("wed" och "thu" i exemplet).
5. Inkludera rättens namn OCH dess beskrivning/tillbehör som en sammanhängande text. Ignorera priser.
6. Hittar du inga rätter alls: returnera tomma listor för alla dagar.

Taggar (bara om det TYDLIGT framgår): "vegetarisk", "vegansk", "fisk", "kött".`;
}

async function extractWeeklyMenuFromText(
  name: string,
  markdown: string,
  apiKey: string,
  todayStr: string
): Promise<Record<string, { name: string; tags?: string[] }[]> | null> {
  const prompt = buildWeekPrompt(name, todayStr) + `\n\nText att analysera:\n${markdown.slice(0, 18000)}`;
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
      console.error(`AI weekly extraction failed for ${name}: ${res.status}`);
      if (res.status === 402) aiCreditsExhausted = true;
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    const byDay = parsed?.dishesByDay;
    if (!byDay || typeof byDay !== 'object') return null;
    return byDay;
  } catch (err) {
    console.error(`AI weekly extraction error for ${name}:`, err);
    return null;
  }
}

function weeklyHasAnyDishes(byDay: Record<string, any>): boolean {
  for (const k of Object.keys(byDay)) {
    if (Array.isArray(byDay[k]) && byDay[k].length > 0) return true;
  }
  return false;
}

/** Vision fallback: extract a full week menu from a page screenshot. */
async function extractWeeklyMenuFromScreenshot(
  name: string,
  screenshotData: string,
  apiKey: string,
  todayStr: string
): Promise<Record<string, { name: string; tags?: string[] }[]> | null> {
  const systemPrompt =
    buildWeekPrompt(name, todayStr) + '\n\nAnalysera bilden/skärmbilden av restaurangens meny nedan.';

  let imageUrl: string;
  if (screenshotData.startsWith('data:')) {
    imageUrl = screenshotData;
  } else if (screenshotData.startsWith('http')) {
    const base64 = await fetchImageAsBase64(screenshotData);
    if (!base64) {
      console.error(`Failed to fetch screenshot for ${name}`);
      return null;
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
      console.error(`AI weekly vision extraction failed for ${name}: ${res.status}`);
      if (res.status === 402) aiCreditsExhausted = true;
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    const byDay = parsed?.dishesByDay;
    if (!byDay || typeof byDay !== 'object') return null;
    return byDay;
  } catch (err) {
    console.error(`AI weekly vision extraction error for ${name}:`, err);
    return null;
  }
}

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
    const mondayKey = mondayKeyOf(now);
    const cacheKeys = Array.from(new Set([todayKey, mondayKey]));

    // Load configurable fetch-window bounds from app_settings.
    // Empty values or start === end means "no window restriction" (all day, weekdays only unless weekends enabled).
    let windowStart = 6;
    let windowEnd = 14;
    let windowDisabled = false;
    try {
      const { data: settingsRows } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['lunch_fetch_window_start', 'lunch_fetch_window_end']);
      const startRaw = String(settingsRows?.find((r: any) => r.key === 'lunch_fetch_window_start')?.value ?? '').trim();
      const endRaw = String(settingsRows?.find((r: any) => r.key === 'lunch_fetch_window_end')?.value ?? '').trim();
      if (startRaw === '' || endRaw === '' || startRaw === endRaw) {
        windowDisabled = true;
      } else {
        const startNum = parseInt(startRaw, 10);
        const endNum = parseInt(endRaw, 10);
        if (Number.isFinite(startNum) && Number.isFinite(endNum)) {
          windowStart = Math.max(0, Math.min(23, startNum));
          windowEnd = Math.max(1, Math.min(24, endNum));
          if (windowEnd <= windowStart) windowEnd = Math.min(24, windowStart + 1);
        }
      }
    } catch { /* keep defaults */ }

    // Normalize a cache row's menu_data: weekly rows are projected to today's view.
    const normalizeMenuData = (md: any) =>
      md?.weekly ? weeklyToTodayMenu(md as WeeklyMenuRaw, now, todayKey) : md;

    const sortByName = (list: any[]) =>
      dedupeByRestaurant(list).sort((a, b) =>
        String(a?.restaurantName ?? '').localeCompare(String(b?.restaurantName ?? ''), 'sv')
      );

    /** One entry per restaurant; weekly-derived menus win over daily rows. */
    const dedupeByRestaurant = (list: any[]) => {
      const byId = new Map<string, any>();
      for (const m of list) {
        const id = m?.restaurantId;
        if (!id) continue;
        const prev = byId.get(id);
        if (!prev || (!prev.weekly && m?.weekly)) byId.set(id, m);
      }
      return Array.from(byId.values());
    };

    // Helper used by both cache-serve and scrape paths: for any active
    // restaurant missing from today's results, substitute yesterday's menu
    // (marked stale). Never reaches further back than 1 day.
    function yesterdayKeyOf(d: Date): string {
      return shiftKey(getTodayKey(d), -1);
    }
    const allowedPrevDatesGlobal = new Set<string>([todayKey, yesterdayKeyOf(now)]);

    async function fillMissingFromYesterday(menus: any[]): Promise<any[]> {
      const haveIds = new Set(menus.map((m: any) => m?.restaurantId));
      const { data: activeRest } = await supabase
        .from('restaurants')
        .select('id, name, website_url, menu_url')
        .eq('active', true);
      const missingRest = (activeRest ?? []).filter((r: any) => !haveIds.has(r.id));
      if (missingRest.length === 0) return menus;
      const missingIds = missingRest.map((r: any) => r.id);

      const { data: prevRows } = await supabase
        .from('lunch_menu_cache')
        .select('menu_data, created_at')
        .in('restaurant_id', missingIds)
        .order('created_at', { ascending: false })
        .limit(missingIds.length * 5);
      const latestPrev = new Map<string, any>();
      for (const row of (prevRows ?? []) as any[]) {
        const id = row.menu_data?.restaurantId;
        if (!id || latestPrev.has(id)) continue;
        if (row.menu_data?.weekly) {
          if (row.menu_data?.weekStart === mondayKey) {
            latestPrev.set(id, normalizeMenuData(row.menu_data));
          }
        } else if (allowedPrevDatesGlobal.has(row.menu_data?.date)) {
          latestPrev.set(id, row.menu_data);
        }
      }
      // For restaurants without ANY usable data, still return a stub so they
      // always appear in "Dagens lunch" with at least a heading.
      const stubs = missingRest
        .filter((r: any) => !latestPrev.has(r.id))
        .map((r: any) => ({
          restaurantId: r.id,
          restaurantName: r.name,
          websiteUrl: r.website_url,
          sourceUrl: r.menu_url,
          date: todayKey,
          dishes: [],
          updatedAt: '',
        }));
      return [...menus, ...Array.from(latestPrev.values()), ...stubs];
    }

    /** Build a Mon–Fri view of the current ISO week purely from cache. */
    async function buildWeek() {
      const mondayStr = mondayKeyOf(now);
      const dayDefs: { date: string; dayKey: DayKey }[] = [];
      for (let i = 0; i < 5; i++) {
        const date = shiftKey(mondayStr, i);
        dayDefs.push({ date, dayKey: DAY_KEYS_BY_INDEX[anchorFromKey(date).getUTCDay()] });
      }

      const { data: rows } = await supabase
        .from('lunch_menu_cache')
        .select('menu_data, week_key')
        .in('week_key', dayDefs.map((d) => d.date));

      const { data: activeRest } = await supabase
        .from('restaurants')
        .select('id, name, website_url, menu_url')
        .eq('active', true);

      const weeklyRows = (rows ?? []).filter(
        (r: any) => r.menu_data?.weekly && r.menu_data?.weekStart === dayDefs[0].date,
      );

      const days = dayDefs.map(({ date, dayKey }) => {
        const daily = (rows ?? [])
          .filter((r: any) => !r.menu_data?.weekly && r.week_key === date)
          .map((r: any) => r.menu_data);
        const weekly = weeklyRows.map((r: any) => weeklyToDayMenu(r.menu_data as WeeklyMenuRaw, dayKey, date));
        const menus = dedupeByRestaurant([...daily, ...weekly]);
        const haveIds = new Set(menus.map((m: any) => m?.restaurantId));
        const stubs = (activeRest ?? [])
          .filter((r: any) => !haveIds.has(r.id))
          .map((r: any) => ({
            restaurantId: r.id,
            restaurantName: r.name,
            websiteUrl: r.website_url,
            sourceUrl: r.menu_url,
            date,
            dishes: [],
            updatedAt: '',
          }));
        return { date, dayKey, menus: sortByName([...menus, ...stubs]) };
      });

      return { weekStart: dayDefs[0].date, days };
    }

    let week = await buildWeek();

    // Check cache for today
    const { data: cacheRowsAll, error: cacheError } = await supabase
      .from('lunch_menu_cache')
      .select('menu_data, created_at, week_key')
      .in('week_key', cacheKeys);

    // Keep: today's daily rows + this week's weekly rows
    const cached = (cacheRowsAll ?? []).filter((row: any) => {
      if (row.menu_data?.weekly) return row.menu_data?.weekStart === mondayKey;
      return row.week_key === todayKey;
    });
    // Whether we have any daily cache for today — drives "serve from cache" decision
    const hasTodayDaily = (cacheRowsAll ?? []).some(
      (row: any) => row.week_key === todayKey && !row.menu_data?.weekly
    );

    // Backfill: restaurants flagged as weekly_menu that have NO weekly cache row
    // for this Monday. Without this, a present daily cache short-circuits the
    // request and the week view never gets per-day data for them.
    let weeklyBackfillIds: string[] = [];
    if (!force && !singleRestaurantId) {
      const { data: weeklyRest } = await supabase
        .from('restaurants')
        .select('id')
        .eq('active', true)
        .eq('weekly_menu', true);
      const haveWeekly = new Set(
        (cacheRowsAll ?? [])
          .filter((r: any) => r.menu_data?.weekly && r.menu_data?.weekStart === mondayKey)
          .map((r: any) => r.menu_data?.restaurantId)
      );
      const missing = (weeklyRest ?? []).map((r: any) => r.id).filter((id: string) => !haveWeekly.has(id));
      if (missing.length > 0 && isWithinFetchWindow(now, windowStart, windowEnd, windowDisabled).allowed) {
        weeklyBackfillIds = missing;
      }
    }

    if (!cacheError && hasTodayDaily && cached.length > 0) {
      // Single restaurant refresh — bypass cooldown, re-scrape only one
      if (singleRestaurantId) {
        // Window check: only allow scraping on weekdays 08–14
        const window = isWithinFetchWindow(now, windowStart, windowEnd, windowDisabled);
        if (!window.allowed) {
          console.log(`Single refresh blocked – outside fetch window: ${window.reason}`);
          const menus = sortByName((await fillMissingFromYesterday(cached.map((row: any) => normalizeMenuData(row.menu_data)))).map((m: any) => ({ ...m, stale: m?.date !== todayKey })));
          return new Response(
            JSON.stringify({ cooldown: true, minutesLeft: 0, reason: window.reason, menus, week }),
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
            const menus = sortByName((await fillMissingFromYesterday(cached.map((row: any) => normalizeMenuData(row.menu_data)))).map((m: any) => ({ ...m, stale: m?.date !== todayKey })));
            return new Response(
              JSON.stringify({ cooldown: true, minutesLeft, menus, week }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        console.log(`Single restaurant refresh for ${singleRestaurantId}`);
      } else if (force) {
        // Window check: only allow scraping on weekdays 08–14
        const window = isWithinFetchWindow(now, windowStart, windowEnd, windowDisabled);
        if (!window.allowed) {
          console.log(`Force refresh blocked – outside fetch window: ${window.reason}`);
          const menus = sortByName((await fillMissingFromYesterday(cached.map((row: any) => normalizeMenuData(row.menu_data)))).map((m: any) => ({ ...m, stale: m?.date !== todayKey })));
          return new Response(
            JSON.stringify({ cooldown: true, minutesLeft: 0, reason: window.reason, menus, week }),
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
          const menus = sortByName((await fillMissingFromYesterday(cached.map((row: any) => normalizeMenuData(row.menu_data)))).map((m: any) => ({ ...m, stale: m?.date !== todayKey })));
          return new Response(JSON.stringify({ cooldown: true, minutesLeft, menus, week }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // Cooldown passed – clear cache and re-scrape
        console.log(`Force refresh allowed – cache is ${Math.floor(ageMs / 60000)}min old`);
        await supabase.from('lunch_menu_cache').delete().in('week_key', cacheKeys);
      } else if (weeklyBackfillIds.length === 0) {
        // Normal request – serve from cache
        console.log(`Serving ${cached.length} menus from cache for ${todayKey}`);
        const todaysMenus = cached.map((row: any) => normalizeMenuData(row.menu_data));
        const filled = await fillMissingFromYesterday(todaysMenus);
        const stamped = filled.map((m: any) => ({ ...m, stale: m?.date !== todayKey }));
        return new Response(JSON.stringify({ menus: sortByName(stamped), week }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log(`Weekly backfill for ${weeklyBackfillIds.length} restaurant(s) missing week ${mondayKey}`);
      }
    } else if (force || singleRestaurantId) {
      // No cache yet — still enforce window for any scrape attempt
      const window = isWithinFetchWindow(now, windowStart, windowEnd, windowDisabled);
      if (!window.allowed) {
        console.log(`Refresh blocked – outside fetch window: ${window.reason}`);
        return new Response(
          JSON.stringify({ cooldown: true, minutesLeft: 0, reason: window.reason, menus: [], week }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Force refresh – no existing cache to check cooldown against`);
    } else {
      // Normal request with no cache: only scrape inside the fetch window
      const window = isWithinFetchWindow(now, windowStart, windowEnd, windowDisabled);
      if (!window.allowed) {
        console.log(`Initial scrape blocked – outside fetch window: ${window.reason}`);
        return new Response(
          JSON.stringify({ menus: [], reason: window.reason, week }),
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
    } else if (weeklyBackfillIds.length > 0) {
      restaurantQuery = restaurantQuery.in('id', weeklyBackfillIds);
    }

    const { data: restaurants, error: restError } = await restaurantQuery.order('name');

    if (restError || !restaurants?.length) {
      console.error('Failed to load restaurants:', restError);
      return new Response(JSON.stringify({ menus: [], week }), {
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
            latestByRestaurant.set(id, normalizeMenuData(row.menu_data));
          }
        }
      }
    }

    // Only substitute from "yesterday or today" — never older. The user
    // explicitly does not want stale messages pointing to data from days ago.
    function yesterdayKey(d: Date): string {
      return shiftKey(getTodayKey(d), -1);
    }
    const allowedPrevDates = new Set<string>([todayKey, yesterdayKey(now)]);

    // Pre-load existing weekly cache for this Monday so we can SKIP re-scraping
    // weekly_menu restaurants that already have a fresh weekly menu cached.
    const weeklyCacheByRestaurant = new Map<string, WeeklyMenuRaw>();
    {
      const { data: weeklyRows } = await supabase
        .from('lunch_menu_cache')
        .select('menu_data')
        .eq('week_key', mondayKey);
      for (const row of (weeklyRows ?? []) as any[]) {
        const md = row.menu_data;
        if (md?.weekly && md?.weekStart === mondayKey && md?.restaurantId && weeklyHasAnyDishes(md.dishesByDay ?? {})) {
          weeklyCacheByRestaurant.set(md.restaurantId, md as WeeklyMenuRaw);
        }
      }
    }

    const BATCH_SIZE = 4;
    const allMenus: unknown[] = [];

    for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
      const batch = restaurants.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (r: any) => {
          // ── Weekly-menu restaurants: scrape at most ONCE per ISO week ──
          if (r.weekly_menu) {
            const cachedWeekly = weeklyCacheByRestaurant.get(r.id);
            const forceThis = singleRestaurantId === r.id || (force && !singleRestaurantId);
            if (cachedWeekly && !forceThis) {
              // Reuse this week's cached weekly menu — no scrape, no cache write.
              return { ...weeklyToTodayMenu(cachedWeekly, now, todayKey), _substituted: true };
            }
            // Collect page text (direct HTML first, Firecrawl markdown as alternative)
            const { candidates, screenshot } = await collectPageContent(r.menu_url, firecrawlKey);
            let byDay: Record<string, { name: string; tags?: string[] }[]> | null = null;
            let usedSource = 'none';
            for (const cand of candidates) {
              console.log(
                `Weekly source ${r.name}: source=${cand.source}, chars=${cand.text.length}, sample=${
                  cand.text.slice(0, 200).replace(/\s+/g, ' ')
                }`,
              );
              const result = await extractWeeklyMenuFromText(r.name, cand.text, lovableKey, todayKey);
              if (result) {
                for (const k of Object.keys(result)) {
                  result[k] = dedupeDishes(result[k] ?? []);
                }
              }
              if (result && weeklyHasAnyDishes(result)) {
                byDay = result;
                usedSource = cand.source;
                break;
              }
            }
            if ((!byDay || !weeklyHasAnyDishes(byDay)) && screenshot) {
              console.log(`Falling back to weekly vision for ${r.name}`);
              const visionByDay = await extractWeeklyMenuFromScreenshot(
                r.name,
                screenshot,
                lovableKey,
                todayKey,
              );
              if (visionByDay) {
                for (const k of Object.keys(visionByDay)) {
                  visionByDay[k] = dedupeDishes(visionByDay[k] ?? []);
                }
                if (weeklyHasAnyDishes(visionByDay)) {
                  byDay = visionByDay;
                  usedSource = 'vision';
                }
              }
            }
            console.log(
              `Weekly scrape ${r.name}: source=${usedSource}, byDay=${
                byDay ? JSON.stringify(Object.fromEntries(Object.entries(byDay).map(([k, v]) => [k, (v ?? []).length]))) : 'null'
              }`,
            );


            if (!byDay || !weeklyHasAnyDishes(byDay)) {
              // Fallback: keep previously known menu (today's view) for this restaurant
              const prev = latestByRestaurant.get(r.id);
              if (prev && (prev.weekly ? prev.weekStart === mondayKey : allowedPrevDates.has(prev.date))) {
                return { ...prev, _substituted: true };
              }
              // Stub so it still appears with a heading
              return {
                restaurantId: r.id,
                restaurantName: r.name,
                websiteUrl: r.website_url,
                sourceUrl: r.menu_url,
                date: todayKey,
                dishes: [],
                updatedAt: '',
              };
            }
            const rawWeekly: WeeklyMenuRaw = {
              restaurantId: r.id,
              restaurantName: r.name,
              websiteUrl: r.website_url,
              sourceUrl: r.menu_url,
              weekly: true,
              weekStart: mondayKey,
              dishesByDay: byDay,
              updatedAt: now.toISOString(),
            };
            const todayMenu = weeklyToTodayMenu(rawWeekly, now, todayKey);
            return { ...todayMenu, _weeklyRaw: rawWeekly };
          }

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

          // Fall back to page scraping (direct HTML, then Firecrawl markdown/vision)
          if (dishes.length === 0) {
            const { candidates, screenshot } = await collectPageContent(r.menu_url, firecrawlKey);

            for (const cand of candidates) {
              console.log(
                `Daily source ${r.name}: source=${cand.source}, chars=${cand.text.length}, sample=${
                  cand.text.slice(0, 200).replace(/\s+/g, ' ')
                }`,
              );
              dishes = await extractMenuFromText(r.name, cand.text, lovableKey, todayKey);
              if (dishes.length > 0) break;
            }

            if (dishes.length === 0 && screenshot) {
              console.log(`Falling back to vision for ${r.name}`);
              dishes = await extractMenuFromScreenshot(r.name, screenshot, lovableKey, todayKey);
            }

            if (dishes.length === 0 && candidates.length === 0 && !screenshot) {
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
      .filter((menu: any) => !menu._substituted)
      .map((menu: any) => {
        // Weekly menu → store the RAW per-day structure under the Monday week_key
        if (menu._weeklyRaw) {
          return {
            week_key: mondayKey,
            restaurant_id: menu.restaurantId,
            menu_data: menu._weeklyRaw,
          };
        }
        if (menu.dishes.length > 0 && menu.date === todayKey) {
          return {
            week_key: todayKey,
            restaurant_id: menu.restaurantId,
            menu_data: menu,
          };
        }
        return null;
      })
      .filter((row: any) => row !== null);

    if (rowsToCache.length > 0) {
      const { error: insertError } = await supabase
        .from('lunch_menu_cache')
        .upsert(rowsToCache, { onConflict: 'week_key,restaurant_id' });
      if (insertError) {
        console.error('Cache insert error:', insertError);
      } else {
        console.log(`Cached ${rowsToCache.length} menus (today=${todayKey}, weekStart=${mondayKey})`);
      }
    } else {
      console.log(`Skipping cache write — 0 menus had dishes (aiCreditsExhausted=${aiCreditsExhausted})`);
    }

    // Helper: stamp `stale` if the menu's date doesn't match today.
    const withStale = (list: any[]) =>
      list.map((m: any) => {
        const { _substituted, _weeklyRaw, ...rest } = m ?? {};
        return { ...rest, stale: rest?.date !== todayKey };
      });

    // Week view must reflect anything we just cached.
    week = await buildWeek();

    // Partial scrape (single restaurant or weekly backfill): merge with cache
    if ((singleRestaurantId || weeklyBackfillIds.length > 0) && cached && cached.length > 0) {
      const updatedIds = new Set(allMenus.map((m: any) => m.restaurantId));
      const existingMenus = cached
        .filter((row: any) => !updatedIds.has(row.menu_data?.restaurantId))
        .map((row: any) => normalizeMenuData(row.menu_data));
      const merged = [...existingMenus, ...allMenus];
      console.log(`Merged: ${allMenus.length} refreshed + ${existingMenus.length} cached = ${merged.length} total`);
      return new Response(JSON.stringify({ menus: sortByName(withStale(merged)), aiCreditsExhausted, week }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Done. Got menus for ${(allMenus as any[]).filter((m: any) => m.dishes.length > 0).length}/${restaurants.length} restaurants.`);

    return new Response(JSON.stringify({ menus: sortByName(withStale(allMenus as any[])), aiCreditsExhausted, week }), {
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
