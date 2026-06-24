## Problem

Vid uppdatering av en enskild restaurang slår edge-funktionen `lunch-menus` ihop den uppdaterade restaurangen med övriga via `[...existingMenus, ...allMenus]` — den uppdaterade hamnar därför sist i svaret, istället för på sin alfabetiska plats.

## Åtgärd

**`supabase/functions/lunch-menus/index.ts`**
- I single-restaurant-grenen, sortera den sammanslagna listan på `restaurantName` (sv-locale) före retur.
- Som extra säkerhet: sortera även huvudgrenens svar och cache-serverade svar på `restaurantName`, så ordningen alltid är alfabetisk oavsett källa.

Ingen ändring i frontend behövs.
