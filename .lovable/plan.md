

## Plan: Per-restaurang menyuppdatering, helg-inställningar, intervall i minuter

### 1. Per-restaurang reload-knapp på LunchPage

**Fil: `src/pages/LunchPage.tsx`**

- I `RestaurantCard`, lägg till en `RefreshCw`-ikon till vänster om `ExternalLink`-ikonen
- Klick anropar `getLunchMenus` med en ny parameter `{ force: true, restaurantId: menu.restaurantId }`
- Visar spinner under laddning, toast vid klart/fel

**Fil: `src/services/lunch.ts`**

- Uppdatera `getLunchMenus` att acceptera optional `restaurantId` i body

**Fil: `supabase/functions/lunch-menus/index.ts`**

- Hantera `restaurantId` i request body — om angett, skrapa och uppdatera bara den restaurangen
- Returnera uppdaterad fullständig menylista (befintlig cache + uppdaterad restaurang)

### 2. Helg-inställning i Admin

**Fil: `src/pages/AdminPage.tsx`**

- Lägg till två checkboxar i Inställningar-kortet:
  - "Uppdatera lunchmenyer på helger" (`lunch_update_weekends`, default `"false"`)
  - "Uppdatera avgångar på helger" (`departure_update_weekends`, default `"true"`)

**Fil: `src/hooks/use-lunch.ts`**

- I `scheduleNext()`: om det är helg och `lunch_update_weekends` är `"false"`, skippa force refresh (schemalägg nästa vardag istället)

**Fil: `src/hooks/use-departures.ts`**

- Om det är helg och `departure_update_weekends` är `"false"`, sätt `refetchInterval` till `false` (ingen auto-refresh)

### 3. Ändra avgångsintervall från sekunder till minuter

**Fil: `src/pages/AdminPage.tsx`**

- Ändra label från "sekunder" till "minuter"
- Ändra `min`/`max` till rimliga minutvärden (1–10)
- Befintligt värde i sekunder konverteras till minuter vid visning (`Math.round(val / 60)`)
- Vid spara: konvertera tillbaka till sekunder (`val * 60`)

**Fil: `src/hooks/use-departures.ts`**

- Ingen ändring behövs — den läser redan värdet i sekunder och multiplicerar med 1000

### Filer som ändras

- `src/pages/LunchPage.tsx` — reload-knapp per restaurang
- `src/services/lunch.ts` — stöd för restaurantId-parameter
- `supabase/functions/lunch-menus/index.ts` — hantera enskild restauranguppdatering
- `src/pages/AdminPage.tsx` — helg-checkboxar + intervall i minuter
- `src/hooks/use-lunch.ts` — helg-check
- `src/hooks/use-departures.ts` — helg-check

