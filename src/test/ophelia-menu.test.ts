import { expect, it } from 'vitest';
import { parseOpheliaWeek } from '../../supabase/functions/_shared/ophelia-menu';

const dishes = ['Måndagsrätt', 'Tisdagsrätt', 'Onsdagsrätt', 'Fiskgryta', 'Viltgryta'].map((name, i) => ({ weekday: i + 1, name, description: 'Med potatis' }));
function page(isoWeek = 48, year = 2026, items = dishes) {
  const flight = `20:${JSON.stringify(['$', 'section', null, { week: { year, isoWeek, dishes: items, alternativeDishes: [{ name: 'Pizza Margherita' }] } }])}\n`;
  return `<script>self.__next_f.push(${JSON.stringify([1, flight])})</script>`;
}
it('läser Ophelias hela måndag–fredag även när bara fredagen syns på sidan', () => {
  const menu = parseOpheliaWeek(page(), '2026-11-23');
  expect(menu?.mon).toEqual([{ name: 'Måndagsrätt – Med potatis' }]);
  expect(menu?.fri).toEqual([{ name: 'Viltgryta – Med potatis' }]);
  expect(menu?.week).toEqual([{ name: 'Pizza Margherita' }]);
});
it('avvisar fel vecka eller år och ofullständig veckomeny', () => {
  expect(parseOpheliaWeek(page(49), '2026-11-23')).toBeNull();
  expect(parseOpheliaWeek(page(48, 2025), '2026-11-23')).toBeNull();
  expect(parseOpheliaWeek(page(48, 2026, dishes.slice(0, 4)), '2026-11-23')).toBeNull();
});
it('avvisar trasiga data utan att köra sidans javascript', () => {
  expect(parseOpheliaWeek('<script>self.__next_f.push([1,evil()])</script>', '2026-11-23')).toBeNull();
});