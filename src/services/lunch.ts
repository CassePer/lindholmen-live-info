import { supabase } from "@/integrations/supabase/client";
import type { LunchMenu, WeeklyLunchMenu } from "@/api/types";
import { format, getISOWeek } from "date-fns";

/**
 * Get the ISO week key for a date, e.g. "2026-W09"
 */
function getWeekKey(date: Date): string {
  return `${format(date, "yyyy")}-W${String(getISOWeek(date)).padStart(2, "0")}`;
}

/**
 * Check if we should trigger a fresh scrape:
 * - It's Monday and after 10:00 Swedish time
 * - No cache exists for the current week
 *
 * Otherwise, read from the database cache.
 */
export async function getLunchMenus(_date?: Date): Promise<LunchMenu[]> {
  const now = _date ?? new Date();
  const weekKey = getWeekKey(now);

  // Always try cache first via the edge function (which handles cache internally)
  const { data, error } = await supabase.functions.invoke("lunch-menus", {
    body: null,
  });

  if (error) {
    console.error("Edge function error:", error);
    throw new Error("Kunde inte hämta lunchmenyer.");
  }

  if (data?.error) {
    console.error("API error:", data.error);
    throw new Error(data.error.message || "Kunde inte hämta lunchmenyer.");
  }

  return data as LunchMenu[];
}

export async function getWeeklyMenus(date?: Date): Promise<WeeklyLunchMenu[]> {
  const menus = await getLunchMenus(date);
  const d = date ?? new Date();
  const week = getWeekKey(d);

  return menus.map((menu) => ({
    restaurantId: menu.restaurantId,
    restaurantName: menu.restaurantName,
    websiteUrl: menu.websiteUrl,
    week,
    days: [
      {
        date: menu.date,
        dayName: "Denna vecka",
        dishes: menu.dishes,
      },
    ],
    sourceUrl: menu.sourceUrl,
    updatedAt: menu.updatedAt,
  }));
}
