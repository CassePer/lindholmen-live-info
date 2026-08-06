# Plan: Endast innevarande veckas meny för Pier 11

## Problem
Pier 11:s sida (Nordrest) visar flera veckor samtidigt — innevarande vecka och nästa vecka — där båda har rubriker för samma veckodagar. AI-extraheringen letar bara efter rubriken för dagens veckodag och plockar därför träffar från båda veckorna, så "Dagens lunch" blir dubbel.

Extraheringsprompten i `supabase/functions/lunch-menus/index.ts` innehåller idag inga regler för vecka eller datum — bara veckodag. Det är orsaken.

## Åtgärd

### 1. Veckoscoping i prompten (daglig extrahering)
- Beräkna ISO-veckonummer och veckans datumintervall (måndag–söndag) för idag, i Europe/Stockholm.
- Lägg till nya regler i prompten:
  - Om texten innehåller flera vecko-sektioner ("Vecka 32", "Vecka 33", "Nästa vecka", datumintervall) → använd ENDAST sektionen för vecka N (aktuellt nummer) eller den som innehåller dagens datum.
  - Ignorera helt allt under andra vecko-rubriker, även om veckodagen matchar.
  - Om exakt datum finns vid dagens veckodag, matcha på datumet i första hand, veckodagen i andra hand.
- Samma regel läggs till i veckomeny-prompten (`buildWeeklyPrompt`) så veckomeny-restauranger bara läser innevarande vecka.

### 2. Dedupe som skyddsnät
- Efter extrahering: filtrera bort dubbletter (normaliserat namn: gemener, trimmad whitespace/skiljetecken) innan menyn cachas. Behåll första förekomsten och ordningen.

### 3. Verifiering
- Tvinga en ny hämtning för Pier 11 via edge-funktionen och kontrollera i loggarna/resultatet att antalet rätter halveras och inte innehåller nästa veckas rätter.

## Teknisk detalj
Alla ändringar sker i `supabase/functions/lunch-menus/index.ts`: hjälpfunktion för ISO-vecka + veckans datumintervall, utökad `buildPrompt`/`buildWeeklyPrompt`, samt en `dedupeDishes`-funktion som körs på resultatet från `extractMenuFromText`. Inga schemaändringar och inga frontend-ändringar.
