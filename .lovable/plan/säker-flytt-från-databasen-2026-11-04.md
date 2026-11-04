# Säker flytt från databasen

## Förutsättningar

Projektet är enligt dig kopplat till GitHub. Jag kan inte se kopplingens status eller aktivera GitHub Pages härifrån utan separat åtkomst till GitHub.

**Det går att köra appen utan databas, men inte enbart med statiska filer om liveavgångar och kameror ska behållas.** Deras API-nycklar måste fortfarande ligga på en server. Att pausa eller ta bort nuvarande Cloud-drift innan ersättningen fungerar riskerar att slå ut funktionerna.

## Det som byggs

1. **Schemalagd menypublicering i GitHub.** Flytta menyhämtningen till ett fristående körbart jobb. Läs restauranger och hämtningsregler från granskad konfiguration, inte databasen. Lägg till schemalagd GitHub Action och möjlighet att starta jobbet manuellt. Publicera validerade lunchmenyer som statisk JSON via GitHub Pages, separat från webbplatsen, så att en ny webbplatspublicering inte krävs varje dag.
2. **Samma menyvisning.** Appen läser JSON-filen och väljer rätt dag och vecka enligt svensk tid. Veckobläddring, källhänvisningar, oförändrade uppdateringstider vid misslyckad hämtning och markering av gamla menyer bevaras. Daglig projektion av en redan hämtad veckomeny ska inte kräva ny skrapning.
3. **Offentliga inställningar som filer.** Flytta endast granskade, offentliga visningsinställningar och restauranguppgifter till versionshanterade filer. Ingen databasdump, intern IP-lista, administratörsuppgift eller hemlig URL publiceras.
4. **Säkra liveanrop utan databas.** Förbered avgångar och kameror för separat serverlös drift, med Cloudflare Workers som mål. Befintliga synlighetsregler och aktiva timmar behålls. Privata API-nycklar lagras enbart som serverhemligheter. Nuvarande Cloud-anrop fungerar under övergången tills ersättningen är verifierad.
5. **Administration via GitHub.** I databasfri drift visas inställningar skrivskyddat i Admin; ändringar och manuell menyhämtning görs i GitHub av behöriga personer. Ingen GitHub-skrivnyckel eller administratörshemlighet skickas till webbläsaren. IP-styrt TV-läge utvärderas enbart på serversidan och lämnar endast tillbaka ja/nej; explicit TV-länk behålls.

## Säkerhet och driftskrav

- Den nuvarande administratörsinloggningen skyddar inte i sig varje skrivande anrop. Den lösningen ska **inte** kopieras till den nya driften. Databasfri administration använder GitHubs behörighetskontroll i stället.
- Alla hemligheter ligger i GitHub Actions Secrets eller den externa serverdriftens hemlighetslager. De får inte byggas in i appen, JSON-filerna, webbläsarlagring eller loggar.
- Exportera och säkerhetskopiera relevant befintlig konfiguration och menydata före byte. Behåll fungerande drift och återställningsmöjlighet under övergången.
- En misslyckad eller felaktig menyhämtning får inte skriva över en fungerande publicerad meny. Menyer från föregående vecka får inte presenteras som aktuell vecka.
- Respektera restaurangernas robots-regler och befintliga hämtningsbegränsningar. Schemaläggning sker med svensk tidskontroll; GitHub garanterar inte exakt starttid.

## Tekniskt genomförande

- Separera befintlig menyhämtning från databasåtkomst. Bevara RSS-hämtningen för Uni3, fullständiga sidkandidater för Bistrot/District One och veckofiltreringen för Pier 11.
- Publicera ett versionsmärkt veckodokument med källor, datum och senaste lyckade hämtning per restaurang. Validera och välj uttryckligen vilka fält som får lämna jobbet.
- Lägg statiska läsningar och serveranrop bakom `/api/v1/*` i appens API-lager. Byt inte bort befintliga fungerande anrop förrän den externa driften är klar.
- GitHub-jobbet får minsta nödvändiga behörigheter, skydd mot samtidiga körningar och separat publiceringssteg efter lyckad validering. Tidigare godkänd data ska kunna återanvändas utan att blanda ihop veckor.
- Lägg regressionstester för svensk dygns-/veckobrytning, gamla menyer, hemlighetsfri publicering, misslyckade hämtningar, skrivskyddad administration samt bevarade aktiva timmar och synlighetsregler.

## Det som kräver åtkomst innan flytten kan slutföras

- GitHub-repository med Actions aktiverat och en publiceringsyta för JSON. GitHub Pages-tillgänglighet för privat repository beror på GitHub-abonnemanget; källkoden ska inte göras offentlig som genväg.
- Extern serverlös drift och dess serverhemligheter för trafik- och kameraanrop. Befintliga privata Cloud-hemligheter antas inte kunna exporteras.
- En verifierad väg för menyextraktion utanför nuvarande databasfunktion, inklusive eventuell AI-/Firecrawl-åtkomst och dess kostnader. Att bara anropa dagens menyfunktion från GitHub tar **inte** bort databasberoendet.

## Klart när

Ett riktigt GitHub-jobb har publicerat korrekta menyer, appen läser tillbaka dem, liveavgångar/kameror och TV-läge fungerar mot ersättningen, och inga appflöden kräver databasen. Först då kan avstängning erbjudas, med separat uttryckligt godkännande. **Ingen databas pausas eller tas bort i denna plan innan detta är kontrollerat.**