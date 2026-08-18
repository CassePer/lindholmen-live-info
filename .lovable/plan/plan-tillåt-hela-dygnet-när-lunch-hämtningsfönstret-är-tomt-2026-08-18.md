# Plan: Tillåt hela dygnet när lunch-hämtningsfönstret är tomt eller lika

## Mål
Gör så att om Admin har lämnat lunchhämtningens start/sluttid tomma, eller satt dem till samma värde, så tillåts menyhämtning dygnet runt (fortfarande vardagar om inte helg-inställningen är på).

## Nuvarande läge (kontrollerat)
- `src/pages/AdminPage.tsx` har två numeriska fält för `lunch_fetch_window_start` (0–23) och `lunch_fetch_window_end` (1–24).
- `supabase/functions/lunch-menus/index.ts` läser dessa värden, clampar dem och tvingar `windowEnd <= windowStart` till `windowStart + 1`.
- `isWithinFetchWindow` blockerar om timmen ligger utanför `[start, end)`.

## Ändringar

### Backend: `supabase/functions/lunch-menus/index.ts`
1. Vid inläsning av `lunch_fetch_window_start` / `lunch_fetch_window_end`:
   - Om något värde är tomt/sträng, saknas helt, eller om `start === end` → sätt `windowDisabled = true`.
   - Annars clampa som idag och behåll `[start, end)`-logiken.
2. Uppdatera `isWithinFetchWindow` så att den kortsluter tidskontrollen när `windowDisabled` är sant (veckodagskontrollen behålls oförändrad).
3. Justera fallback så att tomma/samma värden inte ersätts med default 6–14.

### Frontend: `src/pages/AdminPage.tsx`
1. Tillåt att start- och slutfälten är tomma (`type="number"` utan tvångsfyllnad).
2. Uppdatera hjälptexten under fälten: förklara att tomma fält eller samma start/sluttid betyder "tillåtet dygnet runt".
3. Lägg till en liten statusindikering bredvid fälten när nuvarande värden innebär dygnet-runt-läge.

### Verifiering
- Driftsätt `lunch-menus` edge-funktionen.
- Testa i Admin: töm båda fälten och spara, kontrollera att hämtning inte blockeras av tidsfönstret.
- Testa med samma värde (t.ex. 8 och 8) och verifiera att hämtning tillåts.
