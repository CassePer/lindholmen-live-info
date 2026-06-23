## Diagnos

Edge function-loggarna för `lunch-menus` visar:

```
AI text extraction failed for ...: 402
AI vision extraction failed for ...: 402
Done. Got menus for 0/6 restaurants.
```

**402 = Payment Required** från Lovable AI Gateway → arbetsytans AI-krediter är slut. Skraparen får tom data och cachear 0 menyer.

## Åtgärd (utanför koden)

Fyll på krediter: **workspace-namnet (uppe till vänster) → Settings → Plans & credits**. Så snart krediter finns fungerar nästa körning av `lunch-menus` igen — ingen kodändring behövs för själva orsaken.

## Kodändring jag föreslår ändå

För att appen ska hantera detta tydligt i framtiden:

### 1. `supabase/functions/lunch-menus/index.ts`
- Räkna 402-svar från AI-anropen. Om alla restauranger misslyckas med 402, returnera ett extra fält i svaret:
  ```json
  { "menus": [...senast cachade...], "aiCreditsExhausted": true }
  ```
- Servera senaste cachade menyer från DB även om de är från en tidigare dag (istället för tom lista).

### 2. `src/services/lunch.ts`
- Vidarebefordra `aiCreditsExhausted`-flaggan tillsammans med menyerna.

### 3. `src/pages/LunchPage.tsx`
- Om `aiCreditsExhausted` är true: visa en diskret varningsbanner överst:  
  *"Menyer kunde inte uppdateras — AI-krediter saknas. Visar senaste tillgängliga data."*
- Toast vid manuell refresh-knapp: *"Uppdatering misslyckades — AI-krediter saknas."*

### Filer som ändras
- `supabase/functions/lunch-menus/index.ts`
- `src/services/lunch.ts`
- `src/pages/LunchPage.tsx`
