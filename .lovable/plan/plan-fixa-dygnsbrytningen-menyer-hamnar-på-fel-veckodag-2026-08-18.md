# Plan: Fixa dygnsbrytningen – menyer hamnar på fel veckodag

## Problem
Serverns datumberäkning använder maskinens lokala tid, som i edge-funktionen är UTC. Mellan 00:00 och 02:00 svensk tid är UTC fortfarande föregående dygn.

Konkret just nu (00:05 svensk tid, onsdag = 22:05 UTC tisdag):
- `getTodayKey()`, `mondayKeyOf()` och `todayDayKey()` i `supabase/functions/lunch-menus/index.ts` läser `getFullYear/getMonth/getDate/getDay` från en UTC-baserad `Date`, så servern tror att det är tisdag.
- Fönsterkontrollen (`isWithinFetchWindow`) räknar däremot korrekt i `Europe/Stockholm`. De två går isär två timmar varje natt.
- Följd: onsdagens hämtade meny sparas under tisdagens `week_key`, och veckoprojektionen av veckomenyer plockar tisdagens dag-nyckel. Därför visar tisdagsfliken onsdagens meny.
- Frontend (`src/pages/LunchPage.tsx`) räknar i webbläsarens tidszon och pekar redan på onsdag, vilket gör glappet synligt.

## Lösning
Låt all datum- och veckodagslogik i menyfunktionen räkna i `Europe/Stockholm` istället för serverns UTC.

1. Skriv om `getTodayKey(date)` att formatera datumet via `Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm' })` (ger direkt `YYYY-MM-DD`).
2. Lägg till en hjälpare som ger veckodagsindex i Stockholm-tid, och använd den i `todayDayKey()`, `mondayKeyOf()` och i `buildWeek()` istället för `getDay()`.
3. Byt dag-stegningen (`setDate(+/-1)`, måndagsberäkning, `yesterdayKeyOf`) till att utgå från en Stockholm-normaliserad datumbas så att stegen inte glider över dygnsgränsen.
4. Se över `buildWeekScopeRules()` / veckonummerberäkningen som utgår från `todayStr` så att den bygger på samma Stockholm-baserade nyckel.

## Verifiering
- Kör funktionen med simulerad tid strax efter midnatt och kontrollera att `todayKey` blir det nya datumet.
- Kontrollera i UI att tisdagsfliken visar tisdagens meny och onsdagsfliken onsdagens (eller tom/“ingen meny” om den inte hämtats än).

## Omfattning
Endast `supabase/functions/lunch-menus/index.ts`. Ingen databasändring; befintlig cache med felaktig nyckel skrivs över nästa hämtning.
