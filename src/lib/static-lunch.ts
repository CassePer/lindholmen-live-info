import type { DietTag, LunchDish, LunchMenu, LunchWeek } from "@/api/types";

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;
export type WeekDay = typeof WEEK_DAYS[number];
export interface StaticRestaurant {
  restaurantId: string;
  restaurantName: string;
  websiteUrl: string;
  sourceUrl: string;
  weekStart: string;
  updatedAt: string;
  dishesByDay: Record<WeekDay | "week", LunchDish[]>;
}
export interface StaticLunchDocument {
  schemaVersion: 1;
  generatedAt: string;
  restaurants: StaticRestaurant[];
}

export function stockholmKey(date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function shiftDate(key: string, offset: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function weekMonday(date = new Date()): string {
  const key = stockholmKey(date);
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return shiftDate(key, day === 0 ? -6 : 1 - day);
}

const tags: DietTag[] = ["vegetarisk", "vegansk", "fisk", "kött"];
function safeText(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max || /[<>]/.test(value)) throw new Error("Ogiltig menytext.");
  return value.trim();
}
function publicUrl(value: unknown): string {
  const text = safeText(value, 2000);
  const url = new URL(text);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Ogiltig källadress.");
  return text;
}
/** Whitelist fields. Unknown metadata, credentials and raw pages are never exported. */
export function sanitizeDocument(input: unknown): StaticLunchDocument {
  if (!input || typeof input !== "object") throw new Error("Ogiltig menyfil.");
  const obj = input as Record<string, unknown>;
  if (obj.schemaVersion !== 1 || !Array.isArray(obj.restaurants) || obj.restaurants.length > 20) throw new Error("Ogiltigt menyformat.");
  const generatedAt = safeText(obj.generatedAt, 40);
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error("Ogiltig hämtningstid.");
  const seen = new Set<string>();
  const restaurants = obj.restaurants.map((entry: unknown): StaticRestaurant => {
    if (!entry || typeof entry !== "object") throw new Error("Ogiltig restaurang.");
    const r = entry as Record<string, unknown>;
    const restaurantId = safeText(r.restaurantId, 100);
    if (!restaurantId || seen.has(restaurantId)) throw new Error("Dubblett av restaurang.");
    seen.add(restaurantId);
    const weekStart = safeText(r.weekStart, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || new Date(`${weekStart}T12:00:00Z`).getUTCDay() !== 1) throw new Error("Ogiltig menyvecka.");
    const updatedAt = safeText(r.updatedAt, 40);
    if (updatedAt && !Number.isFinite(Date.parse(updatedAt))) throw new Error("Ogiltig uppdateringstid.");
    const byDay = r.dishesByDay as Record<string, unknown> | undefined;
    const dishesByDay = Object.fromEntries([...WEEK_DAYS, "week"].map((day) => {
      const dishes = byDay?.[day];
      if (!Array.isArray(dishes) || dishes.length > 40) throw new Error("Ogiltiga rätter.");
      const names = new Set<string>();
      const result: LunchDish[] = [];
      for (const dish of dishes) {
        if (!dish || typeof dish !== "object") throw new Error("Ogiltig rätt.");
        const name = safeText(dish.name, 1200);
        if (!name) throw new Error("Tom rätt.");
        const key = name.toLocaleLowerCase("sv").replace(/\s+/g, " ");
        if (names.has(key)) continue;
        names.add(key);
        result.push({ name, tags: Array.isArray(dish.tags) ? dish.tags.filter((t: unknown): t is DietTag => tags.includes(t as DietTag)) : [] });
      }
      return [day, result];
    })) as StaticRestaurant["dishesByDay"];
    return { restaurantId, restaurantName: safeText(r.restaurantName, 150), websiteUrl: publicUrl(r.websiteUrl), sourceUrl: publicUrl(r.sourceUrl), weekStart, updatedAt, dishesByDay };
  });
  return { schemaVersion: 1, generatedAt, restaurants };
}

function project(r: StaticRestaurant, day: WeekDay | undefined, date: string, monday: string): LunchMenu {
  const current = r.weekStart === monday;
  const dishes = current && day ? [...r.dishesByDay[day], ...r.dishesByDay.week.map((d) => ({ ...d, name: `(Hela veckan) ${d.name}` }))] : [];
  return { restaurantId: r.restaurantId, restaurantName: r.restaurantName, websiteUrl: r.websiteUrl, sourceUrl: r.sourceUrl, date, dishes, updatedAt: r.updatedAt, stale: !current };
}

export function projectStaticLunch(input: unknown, now = new Date()): { menus: LunchMenu[]; week: LunchWeek } {
  const doc = sanitizeDocument(input);
  const monday = weekMonday(now);
  const today = stockholmKey(now);
  const days = WEEK_DAYS.map((dayKey, index) => {
    const date = shiftDate(monday, index);
    return { date, dayKey, menus: doc.restaurants.map((r) => project(r, dayKey, date, monday)) };
  });
  const day = WEEK_DAYS[new Date(`${today}T12:00:00Z`).getUTCDay() - 1];
  return { menus: doc.restaurants.map((r) => project(r, day, today, monday)), week: { weekStart: monday, days } };
}