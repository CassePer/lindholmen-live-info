// Pure logic for gating automatic refreshes (departures, cameras).
// Rules: only during active hours, only on allowed days, only when the tab is visible.

export interface RefreshGateOptions {
  /** Allow refreshes on Saturdays/Sundays. Default true. */
  updateWeekends?: boolean;
  /** Active-hours window as hour strings ("0"–"23"). Empty or equal start/end = all day. */
  activeStart?: string | null;
  activeEnd?: string | null;
  now?: Date;
  /** document.visibilityState; defaults to the live value (or "visible" outside browsers). */
  visibilityState?: string;
}

export function isWeekend(now: Date = new Date()): boolean {
  const day = now.getDay();
  return day === 0 || day === 6;
}

export function isWithinActiveHours(
  start: string | null | undefined,
  end: string | null | undefined,
  now: Date = new Date()
): boolean {
  const s = (start ?? "").trim();
  const e = (end ?? "").trim();
  // Empty or equal bounds = restriction disabled (all day)
  if (s === "" || e === "" || s === e) return true;
  const sh = parseInt(s, 10);
  const eh = parseInt(e, 10);
  if (Number.isNaN(sh) || Number.isNaN(eh)) return true;
  const h = now.getHours();
  if (sh < eh) return h >= sh && h < eh;
  // Overnight window, e.g. 22–6
  return h >= sh || h < eh;
}

export function isTabVisible(visibilityState?: string): boolean {
  const state =
    visibilityState ??
    (typeof document !== "undefined" ? document.visibilityState : "visible");
  return state !== "hidden";
}

export function shouldAutoRefresh(opts: RefreshGateOptions = {}): boolean {
  const now = opts.now ?? new Date();
  if (isWeekend(now) && opts.updateWeekends === false) return false;
  if (!isWithinActiveHours(opts.activeStart, opts.activeEnd, now)) return false;
  return isTabVisible(opts.visibilityState);
}
