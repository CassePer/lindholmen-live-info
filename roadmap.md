# Säker drift utan databas

- [x] Förankra säker flytt: statiska lunchmenyer och offentlig konfiguration, separat serverdrift för hemligheter och liveanrop.
- [x] Skapa fristående menyhämtning, schemalagd GitHub Action och validerad JSON-publicering (aktivering avvaktar extern konfiguration).
- [x] Förbered valbart läge för statiska läsningar och versionshanterade API-anrop; befintlig drift behålls.
- [x] Förbered skrivskyddad administration och serverbaserad IP-detektering.
- [ ] Aktivera publiceringsyta: GitHub Pages nekades (abonnemanget stöder inte privata repositoryt); väntar på val av abonnemang eller annan säker publiceringsyta.
- [ ] Registrera Actions-secrets och extern Worker/serverhemligheter; inga GitHub-secrets finns, extern drift är ännu inte konfigurerad.
- [ ] Verifiera ett verkligt publiceringsjobb och databasfri drift genom appen; blockerad av extern aktivering.
- [ ] Erbjud avstängning först efter verifierad extern drift och uttryckligt godkännande.