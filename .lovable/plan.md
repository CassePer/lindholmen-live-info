
## Uppdatera AI-prompten for att inkludera alla ratter

### Problem
AI-prompten instruerar modellen att extrahera "lunchratter", vilket kan leda till att soppor, pannkakor, efterratter och tillbehor filtreras bort (t.ex. Pier11:s "Creamy mushroom soup, pancake, whipped cream and jam").

### Andringar

**Fil:** `supabase/functions/lunch-menus/index.ts`

Uppdatera tre prompter:

1. **`buildPrompt`-funktionen (huvudprompten)** - Rad 59 och regel 6:
   - Andra "Extrahera ENBART lunchratter" till "Extrahera ALLA ratter som listas pa menyn (huvudratter, soppor, tillbehor, desserter, efterratter etc.)"
   - Lagga till en ny regel: "Inkludera ALLA ratter som star pa menyn, oavsett typ. Soppor, pannkakor, efterratter och andra tillbehor ska ocksa tas med."

2. **`isPreFilteredForToday`-prompten** (rad 103):
   - Andra "Extrahera lunchratter" till "Extrahera ALLA ratter"
   - Lagga till instruktion om att inkludera soppor, tillbehor och desserter

3. **Vision-prompten** (`extractMenuFromScreenshot`, rad ~167):
   - Redan anvander `buildPrompt` som bas, sa den far andringen automatiskt

Efter andring: rensa cachen for Pier11 och verifiera att alla 4 ratter kommer med.

### Tekniska detaljer
- Andringarna ar begransade till prompttexterna i edge-funktionen
- Ingen databasandring kravs
- Edge-funktionen behover omdistribueras
- Cachen for Pier11 maste rensas for att testa
