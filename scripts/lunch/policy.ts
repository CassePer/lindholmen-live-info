import { stockholmKey } from "../../src/lib/static-lunch";

export function canScrape(now: Date, start: number | string, end: number | string, weekends: boolean): boolean {
  const day = new Date(`${stockholmKey(now)}T12:00:00Z`).getUTCDay();
  if (!weekends && (day === 0 || day === 6)) return false;
  if (start === "" || end === "" || start === end) return true;
  const hour = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", hour: "2-digit", hour12: false }).format(now));
  return Number(start) < Number(end) ? hour >= Number(start) && hour < Number(end) : hour >= Number(start) || hour < Number(end);
}

export function mayRefresh(lastAttempt: string | undefined, now: Date): boolean {
  return !lastAttempt || now.getTime() - Date.parse(lastAttempt) >= 60 * 60 * 1000;
}