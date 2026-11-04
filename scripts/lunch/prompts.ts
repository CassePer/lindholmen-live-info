import { shiftDate as shiftKey } from "../../src/lib/static-lunch";
function anchorFromKey(key: string): Date { return new Date(`${key}T12:00:00Z`); }
function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Rules that force the model to only read the CURRENT week's section. */
function buildWeekScopeRules(todayStr: string): string {
  const today = anchorFromKey(todayStr);
  const week = isoWeekNumber(today);
  const day = today.getUTCDay();
  const mondayStr = shiftKey(todayStr, day === 0 ? -6 : 1 - day);
  const sundayStr = shiftKey(mondayStr, 6);
  const fmt = (s: string) => s;
  const monday = mondayStr;
  const sunday = sundayStr;

  return `
AKTUELL VECKA: vecka ${week} (${fmt(monday)} – ${fmt(sunday)}). Dagens datum är ${todayStr}.

VECKOSCOPING – VIKTIGAST AV ALLT:
- Sidan kan innehålla FLERA veckor samtidigt (t.ex. "Vecka ${week}" och "Vecka ${week + 1}", "Nästa vecka", eller datumintervall/flikar).
- Använd ENDAST innehållet i sektionen för vecka ${week} eller den sektion vars datumintervall innehåller ${todayStr}.
- Allt under andra vecko-rubriker ska IGNORERAS HELT, även om veckodagen matchar dagens veckodag.
- Står ett exakt datum vid veckodagen: matcha i första hand på datumet ${todayStr}, i andra hand på veckodagens namn.
- Varje rätt får bara förekomma EN gång i svaret – inga dubbletter.`;
}

export function buildWeekPrompt(name: string, todayStr: string): string {
  return `Du är en menyextraherare. Restaurangen "${name}" publicerar HELA veckans meny på måndagen. Extrahera ALLA rätter strukturerat per veckodag (mån–fre).
${buildWeekScopeRules(todayStr)}

Svara ENBART med giltig JSON (inga kommentarer, ingen markdown), exakt detta schema:
{
  "dishesByDay": {
    "mon": [{"name": "Rättens namn – beskrivning", "tags": ["vegetarisk"]}],
    "tue": [],
    "wed": [],
    "thu": [],
    "fri": [],
    "week": []
  }
}

REGLER:
1. Lägg varje rätt under sin veckodag (mon/tue/wed/thu/fri). Ta med ALLA rätter den dagen – huvudrätter, soppor, tillbehör, efterrätter, vegetariska alternativ.
2. INGET dagsprefix i namnet under "mon"/"tue"/… – strukturen anger redan dagen.
3. "week"-listan ska INNEHÅLLA rätter som tydligt gäller HELA VECKAN (rubriker som "Veckans soppa", "Veckans sallad", "Alltid på menyn", "Hela veckan"). Lägg INTE in dagsspecifika rätter där.
4. Dagsintervall (t.ex. "Ons–Tors: Fiskgryta"): duplicera rätten i VARJE veckodag som ingår i intervallet ("wed" och "thu" i exemplet).
5. Inkludera rättens namn OCH dess beskrivning/tillbehör som en sammanhängande text. Ignorera priser.
6. Hittar du inga rätter alls: returnera tomma listor för alla dagar.

Taggar (bara om det TYDLIGT framgår): "vegetarisk", "vegansk", "fisk", "kött".`;
}

