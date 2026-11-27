export const OPHELIA_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'week'] as const;
export type OpheliaMenu = Record<typeof OPHELIA_DAYS[number], { name: string }[]>;

/** Read public Next.js flight data as JSON only; never execute source scripts. */
export function parseOpheliaWeek(html: string, monday: string): OpheliaMenu | null {
  const thursday = new Date(`${monday}T12:00:00Z`);
  if (!Number.isFinite(thursday.getTime()) || thursday.getUTCDay() !== 1) return null;
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const year = thursday.getUTCFullYear();
  const isoWeek = Math.ceil(((thursday.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  function visit(value: unknown): OpheliaMenu | null {
    if (!value || typeof value !== 'object') return null;
    if (!Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (record.year === year && record.isoWeek === isoWeek && Array.isArray(record.dishes)) {
        const menu: OpheliaMenu = { mon: [], tue: [], wed: [], thu: [], fri: [], week: [] };
        const append = (dish: unknown, key: typeof OPHELIA_DAYS[number]) => {
          if (!dish || typeof dish !== 'object') return;
          const item = dish as Record<string, unknown>;
          if (typeof item.name !== 'string' || !item.name.trim() || item.isTemporarilyOut === true) return;
          const description = typeof item.description === 'string' ? item.description.trim() : '';
          const name = `${item.name.trim()}${description ? ' – ' + description : ''}`.replace(/<[^>]*>/g, '').slice(0, 1500);
          if (!menu[key].some((d) => d.name === name)) menu[key].push({ name });
        };
        for (const dish of record.dishes) {
          if (!dish || typeof dish !== 'object') continue;
          const weekday = (dish as Record<string, unknown>).weekday;
          if (typeof weekday === 'number' && Number.isInteger(weekday) && weekday >= 1 && weekday <= 5) append(dish, OPHELIA_DAYS[weekday - 1]);
        }
        // Alternatives are explicitly offered throughout the lunch week.
        if (Array.isArray(record.alternativeDishes)) for (const dish of record.alternativeDishes) append(dish, 'week');
        return OPHELIA_DAYS.slice(0, 5).every((day) => menu[day].length > 0) ? menu : null;
      }
    }
    for (const child of Object.values(value)) {
      const menu = visit(child);
      if (menu) return menu;
    }
    return null;
  }
  for (const match of html.matchAll(/self\.__next_f\.push\((\[.*?\])\)\s*<\/script>/gs)) {
    try {
      const payload: unknown = JSON.parse(match[1]);
      if (!Array.isArray(payload) || typeof payload[1] !== 'string') continue;
      for (const row of payload[1].split('\n')) {
        const start = row.indexOf(':');
        if (start < 0) continue;
        try {
          const menu = visit(JSON.parse(row.slice(start + 1)));
          if (menu) return menu;
        } catch { /* Other flight records are not JSON menu data. */ }
      }
    } catch { /* Ignore malformed scripts and preserve existing cache. */ }
  }
  return null;
}