import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { GatewayError } from "@lovable.dev/ai-gateway";
import config from "./config.json";
import settings from "./settings.json";
import { stockholmKey, weekMonday, sanitizeDocument, WEEK_DAYS, type StaticRestaurant, type StaticLunchDocument } from "../../src/lib/static-lunch";
import { sourceText, renderedSource } from "./sources";
import { extractWeek, ExtractionStopped } from "./extract";
import { canScrape, mayRefresh } from "./policy";

const folder = process.env.LUNCH_STATE_DIR ?? ".lunch-state";
const out = process.env.LUNCH_OUTPUT_DIR ?? "static-data";
interface Progress { paused?: string; attempts: Record<string, string>; document?: StaticLunchDocument }
const now = new Date();
let state: Progress;
try { state = JSON.parse(await readFile(`${folder}/state.json`, "utf8")); }
catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") state = { attempts: {} };
  else throw new Error("Ogiltig privat jobbstatus; manuell återställning krävs.");
}
await mkdir(folder, { recursive: true });
async function save() {
  await writeFile(`${folder}/state.tmp`, JSON.stringify(state));
  await rename(`${folder}/state.tmp`, `${folder}/state.json`);
}
try {
  if (!state.attempts || typeof state.attempts !== "object" || Object.values(state.attempts).some((value) => typeof value !== "string" || !Number.isFinite(Date.parse(value)))) throw new Error("Ogiltig försöksstatus; manuell återställning krävs.");
  if (process.env.LUNCH_RESUME === "true") state.paused = undefined;
  if (config.paused || state.paused) throw new Error("Jobbet är pausat. Kontrollera behörigheter och återuppta manuellt.");
  const monday = weekMonday(now);
  const existing = state.document ? sanitizeDocument(state.document).restaurants : [];
  const results: StaticRestaurant[] = [];
  for (const restaurant of config.restaurants.slice(0, config.maxRestaurants)) {
    const old = existing.find((r) => r.restaurantId === restaurant.id);
    const complete = old?.weekStart === monday && WEEK_DAYS.every((d) => old.dishesByDay[d].length + old.dishesByDay.week.length > 0);
    if (complete || !canScrape(now, config.fetchWindowStart, config.fetchWindowEnd, config.updateWeekends) || !mayRefresh(state.attempts[restaurant.id], now)) {
      if (old) results.push(old);
      continue;
    }
    state.attempts[restaurant.id] = now.toISOString();
    await save(); // Mark attempts before inference; an ambiguous failure is not auto-replayed.
    try {
      const makeEntry = (extracted: unknown): StaticRestaurant => {
        if (!extracted || typeof extracted !== "object" || !("dishesByDay" in extracted)) throw new Error("Ingen veckomeny hittades.");
        return sanitizeDocument({ schemaVersion: 1, generatedAt: now.toISOString(), restaurants: [{ restaurantId: restaurant.id, restaurantName: restaurant.name, websiteUrl: "websiteUrl" in restaurant ? restaurant.websiteUrl : restaurant.url, sourceUrl: restaurant.url, weekStart: monday, updatedAt: now.toISOString(), dishesByDay: extracted.dishesByDay }] }).restaurants[0];
      };
      const source = "rssUrl" in restaurant ? restaurant.rssUrl : restaurant.url;
      let text = await sourceText(source, "rssUrl" in restaurant, monday);
      let entry: StaticRestaurant | undefined;
      if (text.length >= 200) entry = makeEntry(await extractWeek(restaurant.name, text, stockholmKey(now)));
      const hasDishes = (r: StaticRestaurant | undefined) => r && WEEK_DAYS.some((day) => r.dishesByDay[day].length > 0);
      if (!hasDishes(entry) && !("rssUrl" in restaurant)) {
        const rendered = await renderedSource(restaurant.url);
        text = rendered.text;
        if (text.length >= 200) entry = makeEntry(await extractWeek(restaurant.name, text, stockholmKey(now)));
        // Empty valid extraction may use vision; provider failures never switch payloads or retry.
        if (!hasDishes(entry) && rendered.screenshot) entry = makeEntry(await extractWeek(restaurant.name, "Analysera veckomenyn i bilden.", stockholmKey(now), rendered.screenshot));
      }
      if (!entry || !hasDishes(entry)) throw new Error("Ingen aktuell veckomeny hittades.");
      if (old?.weekStart === monday && WEEK_DAYS.some((day) => old.dishesByDay[day].length > 0 && entry.dishesByDay[day].length === 0)) throw new Error("En publicerad dagsmeny saknas i nya hämtningen.");
      results.push(entry);
      const position = existing.findIndex((r) => r.restaurantId === entry.restaurantId);
      if (position >= 0) existing[position] = entry;
      else existing.push(entry);
      state.document = { schemaVersion: 1, generatedAt: now.toISOString(), restaurants: [...existing] };
      await save();
    } catch (error) {
      if (old) results.push(old);
      if (error instanceof GatewayError || error instanceof ExtractionStopped || (error instanceof Error && /^RenderService:(402|403|429)/.test(error.message))) {
        state.paused = error instanceof GatewayError ? `AI:${error.httpStatus ?? error.code}` : "RenderService:denied";
        await save();
        throw new Error("Extern tjänst stoppade jobbet. Kontrollera GitHub Actions och återuppta manuellt.");
      }
      console.warn(`Menyn kunde inte uppdateras för ${restaurant.name}; tidigare data bevaras.`);
    }
  }
  // Do not deploy a partial first run or overwrite a healthy feed with missing restaurants.
  if (results.length !== config.restaurants.length || !results.every((r) => r.weekStart === monday && WEEK_DAYS.some((d) => r.dishesByDay[d].length))) throw new Error("Ingen komplett publicerbar menyfil; tidigare publicering behålls.");
  const document = sanitizeDocument({ schemaVersion: 1, generatedAt: now.toISOString(), restaurants: results });
  await mkdir(`${out}/api/v1`, { recursive: true });
  await writeFile(`${out}/api/v1/lunch.json`, JSON.stringify(document));
  await writeFile(`${out}/api/v1/settings.json`, JSON.stringify(settings));
  await writeFile(`${out}/.nojekyll`, "");
  state.document = document;
  await save();
  console.log(`Validerad menyfil skapad för ${results.length} restauranger.`);
} catch (error) {
  // Only application-written messages go to logs; never dump provider bodies or credentials.
  console.error(error instanceof GatewayError ? "AI-jobbet stoppades." : error instanceof Error ? error.message : "Menyjobbet misslyckades.");
  process.exitCode = 1;
}