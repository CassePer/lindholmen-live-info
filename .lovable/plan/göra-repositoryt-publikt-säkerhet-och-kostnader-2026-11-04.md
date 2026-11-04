# Göra repositoryt publikt – säkerhet och kostnader

## Svar i korthet

- **Fungerar det?** Ja. Med publikt repository blir GitHub Pages och GitHub Actions gratis, så menypubliceringen kan aktiveras.
- **Syns hemligheter?** I nuvarande kod hittades inga API-nycklar, lösenord eller interna IP-listor. Den enda nyckeln i koden är den publika webbläsarnyckeln, som redan syns för alla besökare av appen. Alla riktiga hemligheter ligger i Cloud eller GitHub Secrets och blir inte synliga.
- **Okontrollerat:** äldre versioner i Git-historiken och GitHub-inställningar (t.ex. Issues, Actions-loggar). De måste granskas innan repositoryt görs publikt.

## Kostnader som finns kvar oavsett

- **Menyläsning med AI/Firecrawl** kostar per hämtning, oavsett var jobbet körs. Den kan bara minskas, inte tas bort (veckomenyer hämtas redan en gång per vecka).
- **Avgångar och kameror** behöver en liten server för nycklarna. Cloudflare Workers gratisnivå (100 000 anrop/dag) räcker troligen, men det kräver ett Cloudflare-konto.
- Alternativ utan extern server: behåll avgångar/kameror i Cloud och flytta bara menyerna. Då försvinner inte Cloud-kostnaden helt.

## Det som görs om du godkänner

1. Granska hela Git-historiken efter nycklar, lösenord, IP-listor och privata adresser.
2. Kontrollera att publicerade filer (menyer och inställningar) inte innehåller något privat.
3. Rapportera resultatet. Inget görs publikt automatiskt – det beslutet tar du själv i GitHub.
4. Om något hittas: ta bort det och byt ut berörd nyckel innan repositoryt görs publikt.

Databasen pausas eller tas inte bort i denna plan.
