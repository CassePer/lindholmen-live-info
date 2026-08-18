# Veckovy för lunchmenyer med dagsbläddring

Idag visar lunchsidan endast dagens rätter. Planen lägger till en dagväljare (mån–fre) högst upp, som alltid startar på dagens dag och låter dig bläddra i veckan utan att trigga någon ny hämtning.

## Så fungerar det för användaren

- En rad med fem dagflikar: Mån Tis Ons Tors Fre, med datum under förkortningen.
- Dagens dag är förvald och tydligt markerad. På helger förväljs måndag i kommande vecka.
- Bläddring sker direkt i redan hämtad data — inga extra anrop, inga nya skrapningar.
- Swipe åt sidan på mobil byter dag, pilar-tangenter fungerar på TV/desktop.
- Restauranger som saknar data för vald dag visas ändå med rubrik och texten "Ingen meny publicerad för denna dag" plus länk till webbplatsen.
- Uppdateringsknapparna (global och per restaurang) visas bara när dagens dag är vald — övriga dagar går inte att hämta om.
- "Ej dagens meny"-varningen visas bara på dagens flik, precis som nu.

## Datakällor per dag

Två typer av restauranger finns redan i systemet:

- Veckomeny-restauranger (`weekly_menu`): hela veckan finns redan strukturerad per dag i cachen (`dishesByDay`). Dessa kan visas för alla veckodagar direkt.
- Dagliga restauranger: cachen innehåller en rad per datum. Tidigare dagar i innevarande vecka kan därför visas ur cachen; framtida dagar saknar data och visas som tomma.

## Teknisk lösning

`supabase/functions/lunch-menus/index.ts`
- Ny svarsnyckel `week`: `{ weekStart, days: [{ date, dayKey, menus[] }] }` för mån–fre i innevarande ISO-vecka.
- Byggs enbart från cache: hämta alla `lunch_menu_cache`-rader vars `week_key` är någon av veckans datum eller veckans måndag.
- För veckomeny-rader: generalisera `weeklyToTodayMenu` till `weeklyToDayMenu(raw, dayKey, dateKey)` så samma projicering kan göras för valfri dag (inklusive "Hela veckan"-rätter).
- Varje dag fylls på med stubbar för aktiva restauranger som saknar data, så listan alltid har samma rubriker.
- `menus` (dagens vy) behålls oförändrad för bakåtkompatibilitet och används fortsatt av TV-läget.

`src/api/types.ts`
- Nya typer `LunchDay` och `LunchWeek`.

`src/services/lunch.ts`
- `LunchMenusResult` utökas med `week?: LunchWeek`.

`src/pages/LunchPage.tsx`
- State `selectedDate`, initierad till dagens datum (Europe/Stockholm) med fallback till måndag om helg.
- Ny komponent `WeekDayTabs` (mån–fre, sv-SE, 24h-neutral) ovanför listan, med `aria-selected` och tangentbordsnavigering.
- Kortlistan renderar `week.days[selected].menus`; om `week` saknas i svaret används nuvarande `menus` som fallback så inget bryts.
- Sökfiltret verkar på vald dags menyer.
- Uppdateringsknappar döljs när vald dag inte är idag.

Ingen databasmigrering och inga nya skrapningar krävs.
