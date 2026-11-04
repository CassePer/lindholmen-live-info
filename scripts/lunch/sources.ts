import robotsParser from "robots-parser";
import { XMLParser } from "fast-xml-parser";

const AGENT = "LindholmenLunchBot";
const robots = new Map<string, ReturnType<typeof robotsParser>>();
const nextFetch = new Map<string, number>();
export function htmlText(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6]|section|article)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/[ \t]+/g, " ").trim();
}
async function checkedResponse(urlString: string): Promise<Response> {
  const url = new URL(urlString);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Ogiltig källa.");
  const robotsUrl = `${url.origin}/robots.txt`;
  let rules = robots.get(url.origin);
  if (!rules) {
    const response = await fetch(robotsUrl, { signal: AbortSignal.timeout(15000), redirect: "error", headers: { "User-Agent": AGENT } });
    if (response.status !== 404 && !response.ok) throw new Error("Källans robots-regler kunde inte kontrolleras.");
    rules = robotsParser(robotsUrl, response.status === 404 ? "" : await response.text());
    robots.set(url.origin, rules);
  }
  if (rules.isAllowed(urlString, AGENT) === false) throw new Error("Källan tillåter inte automatisk hämtning.");
  const wait = (nextFetch.get(url.origin) ?? 0) - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  const delay = Math.max(2, rules.getCrawlDelay(AGENT) ?? 0);
  if (delay > 60) throw new Error("Källan kräver längre väntetid än jobbet medger.");
  nextFetch.set(url.origin, Date.now() + delay * 1000);
  return fetch(url, { signal: AbortSignal.timeout(20000), redirect: "manual", headers: { "User-Agent": `${AGENT}/2.0 (+https://lindholmen-live-info.lovable.app)` } });
}
export async function sourceText(url: string, rss: boolean, weekStart: string): Promise<string> {
  const response = await checkedResponse(url);
  if (!response.ok) throw new Error(`Källan svarade ${response.status}.`);
  const raw = await response.text();
  if (raw.length > 2_000_000) throw new Error("Källan är för stor.");
  if (!rss) return htmlText(raw);
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(raw);
  const items = parsed.rss?.channel?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];
  const start = Date.parse(`${weekStart}T12:00:00Z`);
  return list.flatMap((item) => {
    const title = String(item.title ?? "");
    const match = title.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (!match) return [];
    const key = `${match[3]}-${match[2]}-${match[1]}`;
    const stamp = Date.parse(`${key}T12:00:00Z`);
    if (stamp < start || stamp >= start + 7 * 86400000) return [];
    return [`${key} ${title}\n${htmlText(String(item.description ?? ""))}`];
  }).join("\n\n");
}
export async function renderedSource(url: string): Promise<{ text: string; screenshot?: string }> {
  // Check the source rules before asking the render service to access it.
  const response = await checkedResponse(url);
  if (!response.ok) throw new Error("Källan kan inte hämtas.");
  const key = process.env.FIRECRAWL_API_KEY;
  const mode = process.env.FIRECRAWL_MODE;
  if (!key || !["direct", "gateway"].includes(mode ?? "")) throw new Error("Firecrawl saknar verifierad konfiguration.");
  const gateway = mode === "gateway";
  if (gateway && !process.env.LOVABLE_API_KEY) throw new Error("Firecrawl saknar serverbehörighet.");
  const result = await fetch(gateway ? "https://connector-gateway.lovable.dev/firecrawl/v2/scrape" : "https://api.firecrawl.dev/v2/scrape", {
    method: "POST", signal: AbortSignal.timeout(45000),
    headers: gateway ? { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" } : { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, onlyMainContent: false, formats: ["markdown", "screenshot"], waitFor: 5000 }),
  });
  if (!result.ok) throw new Error(`RenderService:${result.status}`);
  const payload = await result.json();
  const data = payload.data ?? payload;
  return { text: data.markdown ?? "", screenshot: data.screenshot };
}