# Lindholmen Live

A mobile-first Swedish-language SPA showing lunch menus, live departures, and traffic cameras for the Lindholmen/Gothenburg area.

## Tech Stack

- **React** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui**
- **TanStack Query** for data fetching

## Getting Started

```bash
npm install
npm run dev
```

The app starts in **mock mode** by default — no backend needed.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `""` | Base URL for the API (e.g. `https://api.lindholmen.live`) |
| `VITE_USE_MOCKS` | `true` | Enable mock mode (set to `false` to use real backend) |

## Architecture

```
src/
├── api/           # API client (only place fetch() is called)
│   ├── client.ts  # fetchApi() wrapper
│   ├── types.ts   # Shared TypeScript types
│   └── mocks/     # Mock data & handler
├── services/      # Business logic consuming API client
├── hooks/         # React hooks for UI consumption
├── auth/          # Auth placeholder (future-proofed)
├── pages/         # Page components
├── components/    # UI components
└── lib/           # Utilities & error handling
```

### API Abstraction

All API calls go through `fetchApi()` in `src/api/client.ts`. No component or service calls `fetch()` directly.

### Swapping the Backend

1. Set `VITE_USE_MOCKS=false`
2. Set `VITE_API_BASE_URL` to your backend URL (e.g. `https://api.lindholmen.live`)
3. Implement the endpoints described in [`API_CONTRACT.md`](./API_CONTRACT.md)
4. No frontend code changes required

### API Versioning

All endpoints are versioned under `/api/v1/`. When breaking changes are introduced, a new version (`/api/v2/`) will be added alongside the old one.

## Features

- **Lunch**: Daily & weekly menus with search and diet tags
- **Departures**: Live transit departures from Lindholmspiren (auto-refresh 30s)
- **Cameras**: Traffic camera grid with modal view (auto-refresh 3 min)

## Security

- No API keys in the frontend bundle
- All lunch content rendered as plain text (no HTML injection)
- Auth module supports bearer tokens but no login required initially
