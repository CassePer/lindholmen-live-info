import { describe, it, expect } from "vitest";
import { isWithinActiveHours, shouldAutoRefresh } from "./refresh-gate";

const at = (day: number, hour: number) => {
  // 2026-10-19 is a Monday; day offset picks weekday, hour sets local hour
  const d = new Date(2026, 9, 19 + day, hour, 0, 0);
  return d;
};

describe("isWithinActiveHours", () => {
  it("allows all day when bounds are empty", () => {
    expect(isWithinActiveHours("", "", at(0, 3))).toBe(true);
    expect(isWithinActiveHours(null, undefined, at(0, 23))).toBe(true);
  });

  it("allows all day when start equals end", () => {
    expect(isWithinActiveHours("0", "0", at(0, 3))).toBe(true);
    expect(isWithinActiveHours("23", "23", at(0, 12))).toBe(true);
  });

  it("gates a normal window 6–22", () => {
    expect(isWithinActiveHours("6", "22", at(0, 6))).toBe(true);
    expect(isWithinActiveHours("6", "22", at(0, 21))).toBe(true);
    expect(isWithinActiveHours("6", "22", at(0, 22))).toBe(false);
    expect(isWithinActiveHours("6", "22", at(0, 5))).toBe(false);
  });

  it("supports overnight windows 22–6", () => {
    expect(isWithinActiveHours("22", "6", at(0, 23))).toBe(true);
    expect(isWithinActiveHours("22", "6", at(0, 2))).toBe(true);
    expect(isWithinActiveHours("22", "6", at(0, 12))).toBe(false);
  });
});

describe("shouldAutoRefresh", () => {
  it("blocks on weekends when weekend updates are off", () => {
    // 2026-10-24 is a Saturday (day offset 5)
    expect(
      shouldAutoRefresh({ updateWeekends: false, now: at(5, 10), visibilityState: "visible" })
    ).toBe(false);
    expect(
      shouldAutoRefresh({ updateWeekends: true, now: at(5, 10), visibilityState: "visible" })
    ).toBe(true);
  });

  it("blocks outside active hours", () => {
    expect(
      shouldAutoRefresh({ activeStart: "6", activeEnd: "22", now: at(0, 23), visibilityState: "visible" })
    ).toBe(false);
    expect(
      shouldAutoRefresh({ activeStart: "6", activeEnd: "22", now: at(0, 12), visibilityState: "visible" })
    ).toBe(true);
  });

  it("blocks when the tab is hidden", () => {
    expect(
      shouldAutoRefresh({ now: at(0, 12), visibilityState: "hidden" })
    ).toBe(false);
  });
});
