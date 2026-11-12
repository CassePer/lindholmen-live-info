import { expect, it } from 'vitest';
import { allowedSource } from '../../supabase/functions/_shared/source-policy';
it('tillåter restaurangkällor men inte interna adresser eller förklädda värdnamn', () => {
  expect(allowedSource('https://bistrot.se/')).toBe(true);
  for (const url of ['http://bistrot.se/', 'https://127.0.0.1/', 'https://bistrot.se.evil.example/', 'https://user:pass@bistrot.se/', 'https://bistrot.se:444/']) expect(allowedSource(url)).toBe(false);
});
it('tillåter Ophelias menyadress och webbplats utan att tillåta förklädda värdnamn', () => {
  expect(allowedSource('https://www.restaurangophelia.se/sv#menu')).toBe(true);
  expect(allowedSource('https://restaurangophelia.se/')).toBe(true);
  expect(allowedSource('https://www.restaurangophelia.se.evil.example/sv#menu')).toBe(false);
});