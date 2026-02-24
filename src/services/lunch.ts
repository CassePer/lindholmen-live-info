import { fetchApi } from "@/api/client";
import type { Restaurant, LunchMenu, WeeklyLunchMenu } from "@/api/types";
import { format, getISOWeek } from "date-fns";

export async function getRestaurants(): Promise<Restaurant[]> {
  return fetchApi<Restaurant[]>("/api/v1/restaurants");
}

export async function getLunchMenus(date?: Date): Promise<LunchMenu[]> {
  const d = date ?? new Date();
  const dateStr = format(d, "yyyy-MM-dd");
  return fetchApi<LunchMenu[]>(`/api/v1/lunch?date=${dateStr}`);
}

export async function getWeeklyMenus(date?: Date): Promise<WeeklyLunchMenu[]> {
  const d = date ?? new Date();
  const week = `${format(d, "yyyy")}-W${String(getISOWeek(d)).padStart(2, "0")}`;
  return fetchApi<WeeklyLunchMenu[]>(`/api/v1/lunch/week?week=${week}`);
}
