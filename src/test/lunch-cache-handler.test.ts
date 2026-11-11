import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

it('servern visar veckocache efter sista tillåtna hämtningen utan externa anrop', async () => {
  const instant = '2026-11-11T17:00:00Z';
  const raw = { restaurantId: 'bistrot', restaurantName: 'Bistrot', websiteUrl: 'https://bistrot.se/', sourceUrl: 'https://bistrot.se/', weekly: true, weekStart: '2026-11-09', updatedAt: '2026-11-09T08:00:00Z', dishesByDay: { wed: [{ name: 'Onsdagsrätt' }] } };
  const tables: Record<string, unknown[]> = {
    app_settings: [{ key: 'lunch_fetch_window_start', value: '7' }, { key: 'lunch_fetch_window_end', value: '15' }],
    restaurants: [{ id: 'bistrot', name: 'Bistrot', active: true, weekly_menu: true }],
    lunch_menu_cache: [{ menu_data: raw, week_key: '2026-11-09', created_at: raw.updatedAt }],
  };
  const query = (table: string) => {
    const builder: Record<string, unknown> = { then: (resolve: (data: unknown) => void) => resolve({ data: tables[table], error: null }) };
    for (const method of ['select', 'in', 'eq', 'order', 'limit']) builder[method] = () => builder;
    return builder;
  };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const externalFetch = vi.fn(() => { throw new Error('Ingen hämtning får ske efter fönstret.'); });
  class Clock extends Date { constructor(value?: string | number | Date) { super(value === undefined ? instant : value instanceof Date ? value.getTime() : value); } }
  const source = readFileSync('supabase/functions/lunch-menus/index.ts', 'utf8').replace(/^import .*;\s*$/gm, '');
  const ts = await import('typescript');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  new Function('Deno', 'createClient', 'allowedSource', 'fetch', 'Date', js)(
    { env: { get: () => 'test-only' }, serve: (fn: typeof handler) => { handler = fn; } },
    () => ({ from: query }), () => true, externalFetch, Clock,
  );
  if (!handler) throw new Error('Menyfunktionen saknas.');
  const response = await handler(new Request('https://example.test/lunch', { method: 'POST', body: '{}' }));
  const result = await response.json();
  expect(result.menus[0].dishes).toEqual([{ name: 'Onsdagsrätt' }]);
  expect(result.menus[0].updatedAt).toBe('2026-11-09T08:00:00Z');
  expect(externalFetch).not.toHaveBeenCalled();
});