import { describe, it, expect } from "vitest";
import { projectStaticLunch, sanitizeDocument, weekMonday, type StaticLunchDocument } from "./static-lunch";

const document: StaticLunchDocument = { schemaVersion: 1, generatedAt: "2026-11-02T09:00:00Z", restaurants: [{ restaurantId: "bistrot", restaurantName: "Bistrot", sourceUrl: "https://bistrot.se/", websiteUrl: "https://bistrot.se/", weekStart: "2026-11-02", updatedAt: "2026-11-02T09:00:00Z", dishesByDay: { mon: [{ name: "Måndagsrätt" }], tue: [{ name: "Tisdagsrätt" }], wed: [{ name: "Onsdagsrätt" }], thu: [], fri: [], week: [] } }] };

describe("statiska lunchmenyer", () => {
  it("byter dag vid svensk midnatt, inte UTC-midnatt", () => {
    expect(projectStaticLunch(document, new Date("2026-11-03T22:59:00Z")).menus[0].dishes[0].name).toBe("Tisdagsrätt");
    expect(projectStaticLunch(document, new Date("2026-11-03T23:01:00Z")).menus[0].dishes[0].name).toBe("Onsdagsrätt");
  });
  it("byter ISO-vecka även före måndag i UTC och över sommartid", () => {
    expect(weekMonday(new Date("2026-11-08T23:01:00Z"))).toBe("2026-11-09");
    expect(weekMonday(new Date("2026-08-16T22:01:00Z"))).toBe("2026-08-17");
  });
  it("presenterar aldrig förra veckans rätter som denna veckas", () => {
    const result = projectStaticLunch(document, new Date("2026-11-09T12:00:00Z"));
    expect(result.menus[0].dishes).toEqual([]);
    expect(result.menus[0].stale).toBe(true);
    expect(result.menus[0].updatedAt).toBe("2026-11-02T09:00:00Z");
  });
  it("publicerar enbart tillåtna fält och tar bort inlagda hemlighetsfält", () => {
    const result = sanitizeDocument({ ...document, ADMIN_PASSWORD: "do-not-publish", restaurants: [{ ...document.restaurants[0], apiKey: "do-not-publish", rawHtml: "private" }] });
    expect(JSON.stringify(result)).not.toContain("do-not-publish");
    expect(result.restaurants[0].restaurantId).toBe("bistrot");
  });
  it("avvisar HTML och källadresser med lösenord", () => {
    expect(() => sanitizeDocument({ ...document, restaurants: [{ ...document.restaurants[0], restaurantName: "<script>" }] })).toThrow();
    expect(() => sanitizeDocument({ ...document, restaurants: [{ ...document.restaurants[0], sourceUrl: "https://user:password@bistrot.se/" }] })).toThrow();
  });
});