import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import robotsParser from 'robots-parser';
import { parseOpheliaWeek } from '../../supabase/functions/_shared/ophelia-menu';

it('hämtar och sparar alla Ophelias vardagar samtidigt utan AI eller Firecrawl', async () => {
  const instant = '2026-11-27T10:00:00Z';
  const dishes = ['Kyckling', 'Jägarbiff', 'Ugnsbakad Lax', 'Fiskgryta', 'Viltgryta'].map((name, i) => ({ weekday: i + 1, name }));
  const flight = `20:${JSON.stringify({ week: { year: 2026, isoWeek: 48, dishes } })}\n`;
  const html = `<script>self.__next_f.push(${JSON.stringify([1, flight])})</script>`;
  const tables: Record<string, Record<string, unknown>[]> = {
    app_settings: [{ key: 'lunch_fetch_window_start', value: '7' }, { key: 'lunch_fetch_window_end', value: '15' }],
    restaurants: [{ id: 'ophelia', name: 'Ophelia', menu_url: 'https://www.restaurangophelia.se/sv', website_url: 'https://www.restaurangophelia.se/sv', active: true, weekly_menu: true }],
    lunch_menu_cache: [],
  };
  const query = (table: string) => {
    let rows = [...tables[table]];
    const builder: Record<string, unknown> = {
      then: (resolve: (value: unknown) => void) => resolve({ data: rows, error: null }),
      eq: (key: string, value: unknown) => { rows = rows.filter((r) => r[key] === value); return builder; },
      in: (key: string, values: unknown[]) => { rows = rows.filter((r) => values.includes(r[key])); return builder; },
      upsert: (values: Record<string, unknown>[]) => { tables[table].push(...values); return Promise.resolve({ error: null }); },
    };
    for (const method of ['select', 'order', 'limit']) builder[method] = () => builder;
    return builder;
  };
  const externalFetch = vi.fn(async (url: string) => {
    if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nAllow: /');
    if (url === 'https://www.restaurangophelia.se/sv') return new Response(html);
    throw new Error(`Otillåtet externt anrop: ${url}`);
  });
  class Clock extends Date { constructor(value?: string | number | Date) { super(value === undefined ? instant : value instanceof Date ? value.getTime() : value); } }
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const source = readFileSync('supabase/functions/lunch-menus/index.ts', 'utf8').replace(/^import .*;\s*$/gm, '');
  const ts = await import('typescript');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  new Function('Deno', 'createClient', 'allowedSource', 'fetch', 'Date', 'parseOpheliaWeek', 'robotsParser', 'setTimeout', js)(
    { env: { get: () => 'test-only' }, serve: (fn: typeof handler) => { handler = fn; } },
    () => ({ from: query }), () => true, externalFetch, Clock, parseOpheliaWeek, robotsParser, (fn: () => void) => { fn(); return 0; },
  );
  if (!handler) throw new Error('Menyfunktionen saknas.');
  const response = await handler(new Request('https://example.test/lunch', { method: 'POST', body: '{}' }));
  const result = await response.json();
  expect(response.status).toBe(200);
  expect(result.menus[0].dishes).toEqual([{ name: 'Viltgryta' }]);
  expect(result.week.days.map((day: { menus: { dishes: { name: string }[] }[] }) => day.menus[0].dishes[0].name)).toEqual(['Kyckling', 'Jägarbiff', 'Ugnsbakad Lax', 'Fiskgryta', 'Viltgryta']);
  expect(tables.lunch_menu_cache[0].week_key).toBe('2026-11-23');
  expect(externalFetch).toHaveBeenCalledTimes(2);
});