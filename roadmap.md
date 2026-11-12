# Säker drift utan databas

## Automatisk Worker-publicering
- [x] Lägg till GitHub Actions för den separata Worker-tjänsten och dokumentera säker aktivering.
- [x] Verifiera tester och publiceringsregler: 8 säkerhetstester godkända och actionlint utan fel.
- [ ] Verifiera verklig Worker-publicering; blockerad av Cloudflare-behörigheter, Worker-hemligheter och aktivering med WORKER_DEPLOY_ENABLED i GitHub.

## Administration och optimeringsbranch
- [x] Tillåt Ophelias menyadress i befintlig säkerhetskontroll och verifiera regressionstest och driftsättning.
- [ ] Kontrollera versionen i chatten ”Optimize Run credit usage”; blockerad av att chatten inte finns i tillgänglig historik och ingen separat GitHub-branch eller Lovable-version är synlig här.

## Menyfel, API:er och säkerhet
- [x] Felsök och rätta tom dagens meny trots tillgänglig veckomeny; lägg till regressionstest.
- [x] Uppdatera Firecrawl och kontrollera övriga externa API-versioner.
- [x] Granska säkerheten, uppdatera kompatibla paket och verifiera med tester och faktisk menyvisning.


- [x] Förankra säker flytt: statiska lunchmenyer och offentlig konfiguration, separat serverdrift för hemligheter och liveanrop.
- [x] Skapa fristående menyhämtning, schemalagd GitHub Action och validerad JSON-publicering (aktivering avvaktar extern konfiguration).
- [x] Förbered valbart läge för statiska läsningar och versionshanterade API-anrop; befintlig drift behålls.
- [x] Förbered skrivskyddad administration och serverbaserad IP-detektering.
- [ ] Aktivera publiceringsyta: GitHub Pages nekades (abonnemanget stöder inte privata repositoryt); väntar på val av abonnemang eller annan säker publiceringsyta.
- [ ] Registrera Actions-secrets och extern Worker/serverhemligheter; inga GitHub-secrets finns, extern drift är ännu inte konfigurerad.
- [ ] Verifiera ett verkligt publiceringsjobb och databasfri drift genom appen; blockerad av extern aktivering.
- [ ] Erbjud avstängning först efter verifierad extern drift och uttryckligt godkännande.