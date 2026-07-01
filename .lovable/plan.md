## Mål

Gör lunchmenyernas tider konfigurerbara i Admin, dölj/inaktivera uppdateringsknappar när dagens meny redan finns, och rensa bort onödig "Nästa uppdatering"-text.

## Nya inställningar i Admin (`app_settings`)

- `lunch_auto_refresh_time` — HH:MM (default `00:01`). När appen automatiskt växlar/hämtar dagens meny. Ersätter dagens `lunch_auto_refresh_hour`.
- `lunch_fetch_window_start` — heltal 0–23 (**default `6`**). Tidigaste tid uppdateringar tillåts.
- `lunch_fetch_window_end` — heltal 0–23 (default `14`, exklusivt). Senaste tid uppdateringar tillåts.
- `lunch_hide_refresh_when_complete` — bool (default `true`). Styr beteendet när dagens meny finns för alla restauranger.

## Admin-UI (`src/pages/AdminPage.tsx`)

Under "Lunch – automatisk uppdatering":

- Byt heltalsfältet för timme → tidsfält (`type="time"`, HH:MM) med default `00:01`. Migrera värde: om bara `lunch_auto_refresh_hour` finns, tolka som `HH:00`.
- Två nya heltalsfält bredvid varandra: "Uppdatering tillåten från kl" (default 6) och "till kl" (default 14), 0–23.
- Checkbox: "Dölj/inaktivera uppdateringsknappar när dagens meny redan finns" (Label + Checkbox i samma stil som helg-checkboxarna).
- Hjälptext: `00:01` = rullar över dygnet; knappar återkommer/återaktiveras när meny saknas eller är stale.

## Auto-refresh i klienten (`src/hooks/use-lunch.ts`)

- Läs `lunch_auto_refresh_time` (HH:MM). Fallback: om bara `lunch_auto_refresh_hour` finns, använd `HH:00`; annars `00:01`.
- Schemalägg nästa körning till angiven tid; respekterar redan `lunch_update_weekends`.

## Fetch-fönstret

**Edge function `supabase/functions/lunch-menus/index.ts`** — `isWithinFetchWindow` slås om från hårdkodat `8–14` till att läsa `lunch_fetch_window_start`/`_end` från `app_settings` (fallback 6/14). Funktionen görs `async` och settings hämtas en gång per request. Sv-SE felmeddelande använder de dynamiska värdena.

**Klient `src/pages/LunchPage.tsx`** — `getRefreshState` tar `windowStart`/`windowEnd` som argument (default 6/14); komponenten läser dem från `useAppSettings` och skickar in. Meddelandet "Öppnar kl HH:00" använder start-timmen.

## Dölj/inaktivera uppdateringsknappar (`LunchPage.tsx`)

- Härled `todayKey` (Europe/Stockholm YYYY-MM-DD).
- `allTodaysMenusPresent = menus.length > 0 && menus.every(m => m.date === todayKey && !m.stale && m.dishes.length > 0)`.
- När `lunch_hide_refresh_when_complete === "true"` och `allTodaysMenusPresent`:
  - **Dölj** den globala "uppdatera alla"-knappen i headern.
  - **Per restaurang**: om restaurangens egen meny är dagens (`m.date === todayKey && !m.stale && m.dishes.length > 0`), **inaktivera** dess refresh-knapp (disabled + tooltip "Dagens meny finns redan"). Övriga (saknade/stale) restauranger behåller aktiv knapp.
- Om någon meny saknas/är stale visas globala knappen fortfarande.

## Ta bort "Nästa uppdatering kl xx:xx"

- I `RestaurantCard`: ta bort raden `{!refreshState.allowed && refreshState.nextLabel && <p ...>{refreshState.nextLabel}</p>}` (den under uppdaterad-tiden).
- Motsvarande text finns kvar i tooltip vid hover — den behålls, men syns inte längre statiskt under menyn.

## Bakåtkompatibilitet

- Cache-fallback (`fillMissingFromYesterday`) behåller gårdagens meny om dagens saknas — inget nytt behövs.
- Gamla `lunch_auto_refresh_hour` läses som fallback tills `lunch_auto_refresh_time` sätts.

## Filer som ändras

- `src/pages/AdminPage.tsx` — nya kontroller, ny default 6.
- `src/hooks/use-lunch.ts` — HH:MM-tid.
- `src/pages/LunchPage.tsx` — läs fönster + göm/inaktivera, ta bort "Nästa uppdatering"-raden.
- `supabase/functions/lunch-menus/index.ts` — dynamiskt fetch-fönster (default 6–14).

Inga schemaändringar.
