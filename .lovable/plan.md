

## Plan: Visa trafikstörningar (alerts) från Trafiklab API

Trafiklab API:et returnerar redan ett `alerts`-fält per avgång. Dessa alerts innehåller störningsinformation (vägarbeten, indragna hållplatser etc.). Idag ignoreras denna data helt.

### Ändringar

**1. Edge function — vidarebefordra alerts** (`supabase/functions/departures/index.ts`)

- Definiera alerts-strukturen i `TrafiklabDeparture.alerts` (header, description, valid from/to)
- Inkludera alerts i `mapDepartures` — samla unika alerts per avgång
- Returnera en samlad `alerts`-lista på toppnivån i svaret (dedupliserade)

**2. Typer** (`src/api/types.ts`)

- Lägg till `Alert`-interface: `{ header: string; description: string; validFrom?: string; validTo?: string; }`
- Lägg till `alerts?: Alert[]` på `Departure`
- Lägg till `alerts?: Alert[]` på `DeparturesResponse`

**3. Frontend — visa alerts i transportslagskorten** (`src/pages/DeparturesPage.tsx`)

- I `GroupedDepartures`: samla alla unika alerts från avgångarna i varje transportgrupp
- Visa en varningsruta (gul/orange `AlertTriangle`-ikon + meddelande) överst i varje Card som har alerts
- Visa header + description i kompakt format
- Om inga alerts finns, visas inget extra

### Resultat

Om t.ex. linje 21 har en alert om indragen hållplats, visas en varningsruta i "Buss"-kortet med meddelandet. Användaren ser direkt att det finns störningar utan att behöva gå till Västtrafiks hemsida.

### Filer som ändras
- `supabase/functions/departures/index.ts`
- `src/api/types.ts`
- `src/pages/DeparturesPage.tsx`

