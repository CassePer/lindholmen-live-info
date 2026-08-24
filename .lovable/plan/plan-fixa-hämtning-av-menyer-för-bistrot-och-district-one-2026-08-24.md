# Plan: Fixa hämtning av menyer för Bistrot och District One

## Vad jag verifierat nu

- Cachen för innevarande vecka (`weekStart = 2026-08-24`) innehåller rader för Uni3, Pier11 och Kooperativet — men inga rader för Bistrot eller District One.
- Funktionsloggarna visar: `Weekly scrape Bistrot: markdown=153 chars, byDay=null` och `Weekly scrape District One: markdown=6574 chars, byDay={mon:0,tue:0,...}`. Bild-fallbacken (vision) körs för båda men ger också noll rätter. Inga AI- eller Firecrawl-fel loggas, så det är inte krediter eller HTTP-fel.
- Jag hämtade båda sidorna direkt: **hela veckans meny finns i vanlig HTML** på både bistrot.se och districtone.se/lunch.html (båda märkta "vecka 35", vilket matchar funktionens veckoberäkning – veckoscopingen är alltså inte orsaken).
- Slutsats: problemet ligger i insamlingssteget. Firecrawl med `onlyMainContent: true` returnerar nästan ingen text för Bistrot (153 tecken av ~4 000 tecken meny) och för District One text som AI:n inte får ut några rätter ur, trots att sidans HTML innehåller allt.

## Åtgärder

### 1. Egen HTML-hämtning som källa (huvudfix)
Lägg till en enkel direkthämtning i `supabase/functions/lunch-menus/index.ts`: hämta `menu_url` med `fetch`, ta bort `script`/`style`, konvertera HTML till ren text och använd den texten för menyextraheringen.

Ordning per restaurang:
1. RSS (som idag, där det finns).
2. Direkthämtad HTML-text — används om den ger mer användbar text än Firecrawl.
3. Firecrawl markdown (behålls för JS-renderade sidor).
4. Firecrawl-skärmbild + vision (behålls som sista utväg).

Firecrawl-anropet ändras dessutom till `onlyMainContent: false` så att menysektioner utanför "huvudinnehållet" inte kapas bort.

### 2. Bättre felsökningsloggar
Logga per restaurang vilken källa som användes och de första ~300 tecknen av texten som skickades till AI:n, så att tomma resultat går att härleda till källa i stället för att bara se `byDay=0`.

### 3. Verifiering
- Kör en forcerad uppdatering och kontrollera i loggarna att Bistrot och District One får text (tusentals tecken) och rätter per dag.
- Kontrollera att cache-rader med `weekly: true` och `weekStart = 2026-08-24` skapas för båda.
- Kontrollera i UI att båda visar olika menyer mån–fre i dagväljaren.

## Omfattning
Endast `supabase/functions/lunch-menus/index.ts`. Ingen databasmigration, inga UI-ändringar.
