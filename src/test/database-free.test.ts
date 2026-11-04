import { describe, it, expect, vi } from "vitest";
import { databaseFreeReady } from "../lib/deployment-mode";
import { canScrape, mayRefresh } from "../../scripts/lunch/policy";
import worker, { isTvIp } from "../../worker/index";
import { safeCameraUrl } from "../../worker/cameras";

describe("säker drift utan databas", () => {
  it("lämnar endast godkända HTTPS-kameralänkar till klienten", () => {
    expect(safeCameraUrl("https://example.org/camera.jpg")).toBe(false);
    expect(safeCameraUrl("http://trafikverket.se/camera.jpg")).toBe(false);
    expect(safeCameraUrl("https://trafikverket.se/camera.jpg")).toBe(true);
  });
  it("byter inte drift innan båda HTTPS-adresserna finns", () => {
    expect(databaseFreeReady("static", "https://example.org", undefined)).toBe(false);
    expect(databaseFreeReady("static", "https://example.org", "http://example.org")).toBe(false);
    expect(databaseFreeReady("static", "https://example.org", "https://api.example.org")).toBe(true);
  });
  it("begränsar skrapning till aktuellt fönster i Stockholm", () => {
    expect(canScrape(new Date("2026-11-04T05:59:00Z"), 7, 15, false)).toBe(false);
    expect(canScrape(new Date("2026-11-04T06:00:00Z"), 7, 15, false)).toBe(true);
    expect(canScrape(new Date("2026-11-04T14:00:00Z"), 7, 15, false)).toBe(false);
    expect(canScrape(new Date("2026-11-07T10:00:00Z"), 7, 15, false)).toBe(false);
  });
  it("tillåter hela dygnet vid tomma eller lika gränser", () => {
    expect(canScrape(new Date("2026-11-04T01:00:00Z"), "", "", false)).toBe(true);
    expect(canScrape(new Date("2026-11-04T01:00:00Z"), 7, 7, false)).toBe(true);
  });
  it("hämtar högst en gång per timme per restaurang", () => {
    expect(mayRefresh("2026-11-04T07:00:00Z", new Date("2026-11-04T07:59:59Z"))).toBe(false);
    expect(mayRefresh("2026-11-04T07:00:00Z", new Date("2026-11-04T08:00:00Z"))).toBe(true);
  });
  it("avvisar skrivande adminanrop utan att anropa en tjänst", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const response = await worker.fetch(new Request("https://api.example.org/api/v1/settings", { method: "POST" }), { ALLOWED_ORIGINS: "https://example.org" });
    expect(response.status).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockRestore();
  });
  it("returnerar endast TV-status, inte IP-lista eller klientadress", async () => {
    const response = await worker.fetch(new Request("https://api.example.org/api/v1/tv", { headers: { "CF-Connecting-IP": "10.1.2.3" } }), { ALLOWED_ORIGINS: "https://example.org", TV_IP_RANGES: "10.0.0.0/8" });
    expect(await response.json()).toEqual({ isTv: true });
    expect(isTvIp("999.0.0.1", "10.0.0.0/8")).toBe(false);
  });
  it("tillåter inte främmande ursprung", async () => {
    const response = await worker.fetch(new Request("https://api.example.org/api/v1/cameras", { headers: { Origin: "https://other.example.org" } }), { ALLOWED_ORIGINS: "https://example.org" });
    expect(response.status).toBe(403);
  });
});