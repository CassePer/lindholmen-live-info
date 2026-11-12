# Drift utan databas

Den nya driften är **förberedd, inte aktiverad**. Befintlig Lovable Cloud-drift lämnas oförändrad. Avstängning får ske först efter nedanstående kontroller.

## 1. GitHub-publicering

- Aktivera Actions i det synkade repositoryt och konfigurera GitHub Pages med **GitHub Actions** som publiceringskälla. Pages kräver ett lämpligt GitHub-abonnemang för privata repositories; gör inte repositoryt offentligt för att kringgå det.
- Kontrollera `scripts/lunch/config.json`: de fem aktiva restaurangkällorna lästes från den befintliga konfigurationen. `settings.json` innehåller granskade lunch-/avgångsinställningar samt standardvärden för aktiva timmar. Granska ytterligare visningsinställningar före byte. Ingen intern IP-lista eller iframe-URL har exporterats.
- Sätt repositoryvariabeln `LUNCH_PUBLISH_ENABLED=true` först när secrets och Pages är klara. Sätt `FIRECRAWL_MODE` till verifierat `direct` eller `gateway`, aldrig utifrån gissning.
- Lägg `LOVABLE_API_KEY` och vid behov `FIRECRAWL_API_KEY` i **GitHub Actions Secrets**. Detta är inte databasnycklar. De privata Cloud-hemligheterna kan inte antas vara exporterbara. Inga nycklar ska skickas i chatten, läggas i `VITE_*` eller checkas in.
- Det fristående jobbet använder Lovable AI SDK och den nya arbetsytans standardmodell för textextraktion; befintlig Cloud-extraktion ändras inte. Anrop från GitHub måste verifieras med ett verkligt jobb. AI/Firecrawl kan medföra användningskostnader.
- Schemat körs varje timme vid minut 17 men skrapar bara inom det granskade svenska fönstret och helgreglerna. Kompletta veckomenyer återanvänds hela veckan. Manuella starter respekterar samma begränsningar.
- Publicering är separat från Lovable-appen: URL:erna blir `<Pages-adress>/api/v1/lunch.json` och `settings.json`. Endast `static-data` publiceras, aldrig källkod, hemligheter eller privat jobbstatus.

## 2. Progress, avbrott och återställning

GitHubs concurrency-lås ersätter databaslåset i denna uttryckligen databasfria lösning. Privat jobbstatus lagras som ett immutable Actions-artifact med senaste försök, lyckade menyer och beständig pausorsak; den återställs före varje körning. Inferenceförsök märks innan anropet så att osäkra utfall inte omedelbart upprepas. Max fem restauranger och högst tre extraktionskandidater per restaurang och körning.

AI-tjänstfel och renderingsfel 402/403/429 pausar jobbet tills en behörig person kontrollerat orsaken och startar manuellt med `resume`. Ingen modell- eller nyckelväxling används för att kringgå ett avslag. Ofullständig första hämtning publiceras inte. En tidigare fungerande dag skrivs inte över med tom data, och äldre veckor visas aldrig som aktuella rätter.

GitHub kan försena eller utebli med schemakörningar. Behåll jobbartifacts och säkerhetskopior: status sparas i 90 dagar, inte för evigt. Radering/utgång av artifacts nollställer progress och pausstatus. Efter lång driftpaus ska operatören återställa en verifierad backup eller uttryckligen granska och starta nytt innan schemat aktiveras. Det här är inte en garanti om exactly-once körning vid förlust av GitHub-status.

## 3. Extern säker live-API

`worker/` är förberedda Cloudflare Workers, inte en lokal server. Publicera där med Wrangler efter att ett Cloudflare-konto och trafik-/kameraåtkomst finns:

```sh
bunx wrangler secret put TRAFIKLAB_API_KEY --config worker/wrangler.toml
bunx wrangler secret put TRAFIKVERKET_API_KEY --config worker/wrangler.toml
bunx wrangler secret put TV_IP_RANGES --config worker/wrangler.toml
bunx wrangler deploy --config worker/wrangler.toml
```

IP-listan är valfri och stannar som serverhemlighet. Endast `isTv` lämnas till klienten; Cloudflares egen `CF-Connecting-IP` används. IPv4/CIDR stöds som tidigare. Konfigurera tillåtna appursprung i `ALLOWED_ORIGINS` samt Cloudflare rate limiting innan publik drift. CORS skyddar inte mot anrop utanför webbläsaren och är ingen autentisering. Alla skrivande metoder avvisas; inget adminlösenord används i nya driften.

### Automatisk Worker-publicering från GitHub

`.github/workflows/deploy-worker.yml` publicerar **bara den separata live-API-tjänsten** `lindholmen-live-api`, aldrig Lovable-appen. Befintlig Cloud-drift och lunchpublicering ändras inte. Flödet är förberett men avstängt tills det aktiveras nedan.

1. Skapa GitHub Actions-miljön `cloudflare-worker`. Begränsa till standardbranchen `main`; lägg gärna till granskningskrav inför publicering om GitHub-abonnemanget stöder det.
2. Lägg `CLOUDFLARE_API_TOKEN` och `CLOUDFLARE_ACCOUNT_ID` i miljöns **Secrets**. Använd en token med Workers Scripts Edit för endast det avsedda kontot; inga DNS-, zon- eller administratörsrättigheter behövs. Lägg aldrig nycklar i kod, chatten eller `VITE_*`.
3. Konfigurera `TRAFIKLAB_API_KEY`, `TRAFIKVERKET_API_KEY` och eventuell `TV_IP_RANGES` som Worker-hemligheter hos Cloudflare enligt kommandona ovan innan tjänsten tas i bruk. De hämtas inte från Lovable Cloud och skrivs inte över av Actions. Granska även tillåtna ursprung och trafikbegränsningar.
4. Kontrollera Cloudflare-kontots plan och användningsgränser innan aktivering. Använd gratisplanen om den räcker; flödet väljer eller uppgraderar inte abonnemang. Worker-trafik kan medföra kostnader på en betald plan, och GitHub Actions omfattas av kontots minutkvot.
5. Sätt repositoryvariabeln `WORKER_DEPLOY_ENABLED=true` och kör **Publicera Cloudflare Worker → Run workflow** från `main` för första verifieringen.

Därefter publiceras ändringar i `worker/`, detta publiceringsflöde och relevanta test-/paketfiler automatiskt vid push till `main`. Andra brancher och ändringsförslag publicerar inte. Vid byte av standardbranch ska workflowets `branches` uppdateras samtidigt. Ett separat concurrency-lås hindrar parallella publiceringar och säkerhetstester måste lyckas före publicering. Wrangler-versionen är låst i flödet för reproducerbar verktygsanvändning.

Sätt `WORKER_DEPLOY_ENABLED=false` för att stoppa kommande publiceringar; det stoppar inte en redan pågående körning och stänger inte av den publicerade tjänsten. Återställ en tidigare granskad Worker-version i `main` och kör flödet igen för återgång. Verklig publicering och läsning genom tjänsten är inte verifierade förrän externa behörigheter och runtime-hemligheter finns.

## 4. Byte och verifiering

Efter lyckat verkligt Pages-jobb och verifierad Worker, sätt följande **offentliga** bygginställningar vid den engångspublicering som aktiverar appens nya läge:

```text
VITE_DATA_MODE=static
VITE_STATIC_DATA_URL=<HTTPS-adressen till GitHub Pages, utan /api/v1>
VITE_API_BASE_URL=<HTTPS-adressen till Cloudflare Worker>
```

Ingen automatisk fallback till databasen görs i aktiverad statisk drift. Saknas fullständig konfiguration fortsätter befintlig Cloud-drift. Admin blir skrivskyddad; ändringar görs med GitHub-behörigheter. Befintliga öppna adminfunktioner påverkas inte av att en alternativ klient införs: de måste avvecklas vid det slutliga bytet.

- Verifiera JSON i offentlig drift, måndag–fredag med olika verkliga rätter, svensk midnatt och veckobrytning.
- Kontrollera avgångar, störningar, kamerabilder, IP-/URL-styrt TV-läge, synlighetsregler och aktiva timmar på dator och TV.
- Granska publicerade filer, klientlagring och nätverk: inga hemligheter eller Cloud-/databasberoenden får finnas i aktiva flöden.
- Säkerhetskopiera nuvarande data och inställningar privat. Testa återgång genom att ta bort `VITE_DATA_MODE=static` och publicera på nytt medan gamla tjänster finns kvar.
- Pausa inte och ta inte bort Cloud innan all extern drift lästs tillbaka genom appen och användaren uttryckligen godkänt avstängning. Nuvarande Cloud-funktioner kan sluta fungera när Cloud pausas/tas bort.

## Status

GitHub-kontroll den 4 november 2026: `Publicera lunchmenyer` finns och är active i det privata repositoryt `CassePer/lindholmen-live-info`. Inga repositorysecrets är registrerade. Försök att skapa Pages nekades med HTTP 422: GitHub-abonnemanget stöder inte Pages för detta repository. Repositoryt har inte gjorts offentligt. Aktivering kräver ett passande GitHub-abonnemang eller en separat godkänd publiceringsyta samt nödvändiga serverhemligheter.

Lokala tester täcker menydatum, veckor, exportfält, skrivskyddade anrop och TV-sekretess. GitHub-jobb, Pages, externa serverhemligheter, rate limiting och verklig databasfri drift måste konfigureras och verifieras externt; de är inte klara bara för att koden finns.