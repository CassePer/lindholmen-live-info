import { supabase } from "@/integrations/supabase/client";
import type { LunchMenu, WeeklyLunchMenu } from "@/api/types";
import { format, getISOWeek } from "date-fns";

export async function getLunchMenus(_date?: Date): Promise<LunchMenu[]> {
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
  // Weekly menus reuse daily scrape - not supported yet
  const menus = await getLunchMenus(date);

  const d = date ?? new Date();
  const week = `${format(d, "yyyy")}-W${String(getISOWeek(d)).padStart(2, "0")}`;

  return menus.map((menu) => ({
    restaurantId: menu.restaurantId,
    restaurantName: menu.restaurantName,
    websiteUrl: menu.websiteUrl,
    week,
    days: [
      {
        date: menu.date,
        dayName: "Idag",
        dishes: menu.dishes,
      },
    ],
    sourceUrl: menu.sourceUrl,
    updatedAt: menu.updatedAt,
  }));
}
