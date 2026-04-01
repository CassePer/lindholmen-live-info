

## Plan: Korrigera linjefärger, felsök busstider, admin för avgångsplatser och synlighet

### 1. Korrigera linjefärger enligt bilderna

Baserat på bilderna — de korrekta badge-färgerna:

**Spårvagnar:**
| Linje | Badge-färg | Text |
|-------|-----------|------|
| 1 | Mörk/svart `#333333` | Vit |
| 2 | Vit `#FFFFFF` | Svart (border) |
| 3 | Blå `#004B93` | Vit |
| 4 | Grön `#009640` | Vit |
| 5 | Röd/korall `#E3000B` | Vit |
| 6 | Gul `#FFD700` | Svart |
| 7 | Brun `#8B4513` | Vit |
| 8 | Rosa `#E6007E` | Vit |
| 9 | Ljusblå `#00A5E3` | Vit |
| 10 | Gulgrön `#C4D600` | Svart |
| 11 | Svart `#1D1D1B` | Vit |
| 12 | Grå `#6D6E71` | Vit |

**Stombussar:**
| Linje | Badge-färg | Text |
|-------|-----------|------|
| 17 | Blå `#0066B3` | Vit |
| 18 | Marinblå `#1D1D5C` | Vit |
| 19 | Grön `#009640` | Vit |
| 21 | Röd `#B5121B` | Vit |
| 25 | Teal `#006461` | Vit |

**Expressbussar** — alla har SAMMA limegröna badge:
| Linje | Badge-färg | Text |
|-------|-----------|------|
| X1–X90 | Limegrön `#78BE20` | Vit |

**Färjor** (från bilden):
| Linje | Badge-färg | Text |
|-------|-----------|------|
| 281–284 | Blå `#0066B3` | Vit |
| 285 | Teal `#006461` | Vit |
| 286 | Orange `#F39100` | Vit |
| 287 | Rosa `#E6007E` | Vit |

**Fil:** `src/pages/DeparturesPage.tsx` — uppdatera `LINE_COLORS`

### 2. Felsök saknade busstider

Koden ser korrekt ut — buss mappar till `transport_mode_code` 700. Troligtvis ett tillfälligt API-problem, men jag lägger till bättre felhantering och loggning:
- I edge function: logga antal avgångar per transporttyp som returneras
- Frontend: visa tydligare felmeddelande om ett specifikt transportslag saknar data

**Fil:** `supabase/functions/departures/index.ts` — lägg till debug-loggning

### 3. Admin: konfigurera hållplats-ID per transporttyp

Lägg till nya `app_settings`-nycklar:
- `departure_stop_bus` (default: `740059410`)
- `departure_stop_tram` (default: `740059410`)
- `departure_stop_ferry` (default: `740059412`)

Admin-UI: tre inputfält med "Hållplats-ID" per transporttyp med sparknapp.

Edge function: läs stop-IDs från `app_settings` istället för hårdkodade konstanter.

**Filer:**
- `src/pages/AdminPage.tsx` — nytt avsnitt "Avgångar – hållplatser"
- `supabase/functions/departures/index.ts` — hämta stop-IDs från DB

### 4. Admin: visa/dölj transporttyper (checkboxar)

Nya `app_settings`-nycklar:
- `departure_show_bus` (default: `"true"`)
- `departure_show_tram` (default: `"true"`)
- `departure_show_ferry` (default: `"true"`)

Admin-UI: tre checkboxar under avgångsinställningarna.

Frontend: `DeparturesPage` filtrerar bort dolda transporttyper baserat på settings.

**Filer:**
- `src/pages/AdminPage.tsx` — checkboxar
- `src/pages/DeparturesPage.tsx` — filtrera på settings

### 5. Förslag på ytterligare förbättringar

Några saker att överväga:
- **Max antal avgångar per grupp** (konfigurerbart i admin)
- **Tidsfilter** — visa bara avgångar inom X minuter framåt (konfigurerbart)
- **Pendeltåg som transporttyp** — edge function mappar redan `code 100` till "Tåg" men det ingår inte i `TransportType`-typen

### Filer som ändras

- `src/pages/DeparturesPage.tsx` — färgfix + filtrera dolda transporttyper
- `src/pages/AdminPage.tsx` — hållplats-IDs + checkboxar för synlighet
- `supabase/functions/departures/index.ts` — dynamiska stop-IDs från DB + loggning
- `src/api/types.ts` — eventuellt lägga till "Tåg" i `TransportType`

