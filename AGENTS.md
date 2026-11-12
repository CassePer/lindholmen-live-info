# Architecture rules

- Keep Cloud mode as the default until both HTTPS static-data and external-API origins are configured; this preserves a reversible migration.
- Database-free mode reads public weekly menus/settings via the API layer and uses serverless proxies for credentialed realtime calls; credentials never enter browser code.
- Database-free administration is read-only and GitHub-controlled; browser session flags must never authorize mutations.
- Scheduled publishing runs in GitHub Actions with concurrency locking and private durable progress artifacts; only validated, allowlisted menu/settings files are published to Pages.
- The portable scraper and external Worker live outside src and are never imported by client code; Cloud functions remain active during migration and receive independent bug/security fixes.
- Administrative functions verify short-lived server-signed sessions on every privileged request; browser state alone never authorizes changes.
- Today's lunch uses current-week cached dishes even outside scraping hours; refreshes retain healthy cache until validated replacements exist.
- Deploy the standalone Worker through a separately gated GitHub Actions environment with concurrency locking and runtime security tests; this keeps deployment credentials out of the client and leaves Cloud migration reversible.