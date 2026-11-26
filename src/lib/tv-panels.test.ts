import { describe, it, expect } from "vitest";
import { parseTvPanels, toggleTvPanel } from "./tv-panels";

describe("tv panels", () => {
  it("defaults to lunch + departures", () => expect(parseTvPanels(undefined)).toEqual(["lunch", "departures"]));
  it("rejects all three", () => expect(parseTvPanels("lunch,departures,cameras")).toEqual(["lunch", "departures"]));
  it("accepts one", () => expect(parseTvPanels("cameras")).toEqual(["cameras"]));
  it("cannot add a third", () => expect(toggleTvPanel(["lunch", "departures"], "cameras")).toBeNull());
  it("cannot remove the last", () => expect(toggleTvPanel(["cameras"], "cameras")).toBeNull());
  it("can add a second", () => expect(toggleTvPanel(["cameras"], "lunch")).toEqual(["lunch", "cameras"]));
});
