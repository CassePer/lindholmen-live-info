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

Lokala tester täcker menydatum, veckor, exportfält, skrivskyddade anrop och TV-sekretess. GitHub-jobb, Pages, externa serverhemligheter, rate limiting och verklig databasfri drift måste konfigureras och verifieras externt; de är inte klara bara för att koden finns.