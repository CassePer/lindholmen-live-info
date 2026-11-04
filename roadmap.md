# Säker drift utan databas

- [x] Förankra säker flytt: statiska lunchmenyer och offentlig konfiguration, separat serverdrift för hemligheter och liveanrop.
- [x] Skapa fristående menyhämtning, schemalagd GitHub Action och validerad JSON-publicering (aktivering avvaktar extern konfiguration).
- [x] Förbered valbart läge för statiska läsningar och versionshanterade API-anrop; befintlig drift behålls.
- [x] Förbered skrivskyddad administration och serverbaserad IP-detektering.
- [ ] Konfigurera GitHub Pages/Actions-secrets och extern Worker/serverhemligheter; blockerad av åtkomst och externa driftinställningar.
- [ ] Verifiera ett verkligt publiceringsjobb och databasfri drift genom appen; blockerad av extern aktivering.
- [ ] Erbjud avstängning först efter verifierad extern drift och uttryckligt godkännande.