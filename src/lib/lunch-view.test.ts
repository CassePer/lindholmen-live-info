import { describe, expect, it } from "vitest";
import { menusForDate } from "./lunch-view";
import type { LunchMenu, LunchWeek } from "@/api/types";

const today = "2026-11-11";
const menu: LunchMenu = { restaurantId: "bistrot", restaurantName: "Bistrot", websiteUrl: "https://bistrot.se/", sourceUrl: "https://bistrot.se/", date: today, dishes: [{ name: "Onsdagsrätt" }], updatedAt: "2026-11-09T08:00:00Z" };
const week: LunchWeek = { weekStart: "2026-11-09", days: [{ date: today, dayKey: "wed", menus: [menu] }, { date: "2026-11-10", dayKey: "tue", menus: [{ ...menu, date: "2026-11-10", dishes: [{ name: "Tisdagsrätt" }] }] }] };

describe("dagens lunch från veckocache", () => {
  it("visar onsdagens meny även om dagens svar är tomt efter sista hämtningen", () => {
    expect(menusForDate([], week, today, today)[0].dishes).toEqual([{ name: "Onsdagsrätt" }]);
  });
  it("ersätter en tom dagsmeny utan att ändra den verkliga uppdateringstiden", () => {
    const result = menusForDate([{ ...menu, dishes: [], updatedAt: "" }], week, today, today);
    expect(result[0].updatedAt).toBe("2026-11-09T08:00:00Z");
    expect(result[0].dishes).toHaveLength(1);
  });
  it("visar aldrig tisdagens rätter som onsdagens", () => {
    expect(menusForDate([], week, "2026-11-10", today)[0].dishes[0].name).toBe("Tisdagsrätt");
    expect(menusForDate([], { ...week, days: week.days.slice(1) }, today, today)).toEqual([]);
  });
});