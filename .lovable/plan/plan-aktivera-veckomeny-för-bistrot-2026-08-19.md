# Plan: Aktivera veckomeny för Bistrot

## Nuläge (verifierat)
- Alla fem restauranger har `weekly_menu = false` i databasen, så veckomeny-logiken i `supabase/functions/lunch-menus/index.ts` körs aldrig.
- Cachen innehåller enbart dagsrader (`week_key = datum`, ingen rad med `weekly: true`). Därför är veckovyns övriga dagar tomma.
- Veckomaskineriet finns redan: kryssrutan i Admin, `extractWeeklyMenuFromText`, lagring under måndagens `week_key` och projektion per dag via `weeklyToDayMenu`.

## Ändringar

### 1. Markera Bistrot som veckomeny
Databasmigration som sätter `weekly_menu = true` för Bistrot. (Kan även ändras i Admin framöver.)

### 2. Hämta veckomeny vid behov, inte bara på måndagar
I `supabase/functions/lunch-menus/index.ts`:
- Om det saknas en giltig veckocache för innevarande vecka (`weekStart = måndagens datum`) eller om den saknar rätter, ska en veckoskrapning göras vilken vardag som helst inom det tillåtna hämtningsfönstret.
- Finns giltig veckocache återanvänds den utan skrapning (som idag), utom vid manuell forcerad uppdatering.
- Misslyckas veckoskrapningen behålls nuvarande fallback (senast kända meny / stub), så restaurangen alltid syns.

### 3. Veckovyn ska använda veckocachen fullt ut
Säkerställ att `buildWeek()` projicerar Bistrots veckorad till alla dagar mån–fre, även för dagar utan egen dagsrad.

## Verifiering
- Kör en forcerad uppdatering och kontrollera att en cache-rad med `weekly: true` och `weekStart = 2026-08-17` skapas för Bistrot.
- Kontrollera i UI att Bistrot visar rätter på flera dagar i dagväljaren (mån–fre) och att prefix som "(Hela veckan)" / "(Ons–Tors)" följer med.

## Omfattning
En databasmigration (flaggan) samt ändringar i `supabase/functions/lunch-menus/index.ts`. Inga UI-ändringar krävs.
