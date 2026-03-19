

## Plan: Spårvagnsfärger per linje + Fixa ghost-knappar på TV

### 1. Lägg till spårvagnsfärger per linje

**Fil: `src/pages/DeparturesPage.tsx`**

Lägg till en `TRAM_LINE_COLORS`-map med Göteborgs spårvagnslinjer och deras officiella färger:

| Linje | Färg | Hex |
|-------|------|-----|
| 1 | Vit | `#FFFFFF` (svart text) |
| 2 | Gul | `#FFD700` (svart text) |
| 3 | Blå | `#0066B3` |
| 4 | Grön | `#009640` |
| 5 | Röd | `#E3000B` |
| 6 | Orange | `#F39100` |
| 7 | Brun | `#8B4513` |
| 8 | Rosa | `#E6007E` |
| 9 | Blå | `#00A5E3` |
| 10 | Gul/grön | `#C4D600` (svart text) |
| 11 | Svart/vit | `#1D1D1B` |
| 13 | Mörklila | `#6F2282` |

I `DepartureRow` — om `dep.transportType === "Spårvagn"`, använd inline `style` med `backgroundColor` och `color` från mappen istället för den generiska `TRANSPORT_COLORS`-klassen.

### 2. Fixa ghost-knappar (Sök/Refresh) för TV-läge

Problemet: `variant="ghost"`-knappar har nästan osynliga ikoner mot den ljusa bakgrunden i ljust tema.

**Fil: `src/index.css`** — Justera dark-mode CSS-variablerna så ghost-knappens `hover:bg-accent` ger bättre kontrast. Alternativt, ändra `--muted-foreground` i ljust läge till en mörkare nyans så ikonerna syns bättre.

Konkret: ändra ljust läges `--muted-foreground` från `220 10% 46%` till `220 10% 38%` (mörkare grå), samt `--accent` från `25 85% 58%` till `220 10% 90%` (neutral ljusgrå istället för orange) för hover-bakgrund, så att ghost-knappar får en subtil grå hover istället.

### Filer som ändras

- `src/pages/DeparturesPage.tsx` — linjefärgskarta + uppdaterad `DepartureRow`
- `src/index.css` — justerade ljust-tema-variabler för bättre ghost-knapps-kontrast

