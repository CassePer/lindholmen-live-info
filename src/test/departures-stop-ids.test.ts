import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Regression test: the departures edge function must use the built-in
// standard stop IDs directly and never query app_settings per poll.
const src = readFileSync(
  resolve(__dirname, "../../supabase/functions/departures/index.ts"),
  "utf-8"
);

describe("departures edge function – standardiserade stopp-ID:n", () => {
  it("definierar inbyggda standard-stopp-ID:n", () => {
    expect(src).toMatch(/const DEFAULT_STOP_BUS = '740059410'/);
    expect(src).toMatch(/const DEFAULT_STOP_TRAM = '740059410'/);
    expect(src).toMatch(/const DEFAULT_STOP_FERRY = '740059412'/);
  });

  it("använder standard-ID:na direkt i stopIds", () => {
    expect(src).toMatch(
      /stopIds = \{ bus: DEFAULT_STOP_BUS, tram: DEFAULT_STOP_TRAM, ferry: DEFAULT_STOP_FERRY \}/
    );
  });

  it("frågar inte efter app_settings vid polling", () => {
    expect(src).not.toMatch(/app_settings/);
    expect(src).not.toMatch(/createClient/);
    expect(src).not.toMatch(/\.from\(/);
  });
});
