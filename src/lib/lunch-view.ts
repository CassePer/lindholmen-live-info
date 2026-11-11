import type { LunchMenu, LunchWeek } from "@/api/types";

/** The week and today's projection must never disagree about available dishes. */
export function menusForDate(today: LunchMenu[], week: LunchWeek | undefined, date: string, todayKey: string): LunchMenu[] {
  const selected = week?.days.find((day) => day.date === date)?.menus;
  if (date !== todayKey) return selected ?? [];
  const byId = new Map(today.map((menu) => [menu.restaurantId, menu]));
  for (const menu of selected ?? []) {
    const existing = byId.get(menu.restaurantId);
    if (!existing || (menu.date === todayKey && !menu.stale && menu.dishes.length > 0)) byId.set(menu.restaurantId, menu);
  }
  return [...byId.values()];
}