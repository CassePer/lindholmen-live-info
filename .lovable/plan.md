
## Gör Uppdatera-knappen diskretare

Ändra knappen i `src/pages/DeparturesPage.tsx` från en outline-knapp med text ("Uppdatera") till en minimal ghost-ikonknapp (bara RefreshCw-ikonen, utan text).

### Ändringar

**Fil:** `src/pages/DeparturesPage.tsx`

- Ändra `variant="outline"` till `variant="ghost"`
- Ändra `size="sm"` till `size="icon"`
- Ta bort texten "Uppdatera" från knappen
- Behåll `aria-label` för tillgänglighet
- Ta bort `hover-scale`-klassen och `mr-1` från ikonen
