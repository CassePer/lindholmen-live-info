

# Lindholmen Live – Implementation Plan

## Overview
A mobile-first Swedish-language SPA showing lunch menus, live departures, and traffic cameras for the Lindholmen/Gothenburg area. Built with a strict API abstraction layer so the backend can be swapped to .NET 10 without any frontend changes.

---

## Phase 1: Architecture & Foundation

### Project Structure
Set up the folder architecture with strict separation:
- `/src/api/` – API client with typed fetch wrapper, base URL from `VITE_API_BASE_URL`, optional bearer token support
- `/src/api/mocks/` – Mock data and mock handler activated via `VITE_USE_MOCKS=true`
- `/src/services/` – Business logic layer consuming the API client
- `/src/hooks/` – React hooks for UI consumption (data fetching, polling, refresh)
- `/src/auth/` – Placeholder auth module (no login yet, future-proofed)
- `/src/lib/errors.ts` – Central error handling with typed error shape `{ error: { code, message } }`

### API Client
- Single `fetchApi()` function – the only place `fetch()` is called
- Configurable base URL, versioned routes (`/api/v1/*`)
- Optional `Authorization: Bearer` header support
- Structured error logging on failures
- Mock mode that intercepts calls and returns realistic Swedish test data

### Documentation
- `API_CONTRACT.md` – Full REST contract for all endpoints with request/response types
- `README.md` – Environment variables, backend swap instructions, API versioning

---

## Phase 2: Lunch Menus

### Features
- **Tabs**: "Idag" (today) and "Veckan" (weekly view)
- **Restaurant cards** showing: name, website link, dishes (rendered as plain text only – no HTML injection), "Uppdaterad:" timestamp
- **Search field** to filter restaurants
- **Optional diet tags**: vegetarisk, vegansk, fisk, kött
- **Source attribution** and Swedish disclaimer: *"Menyer kan ändras – kontrollera restaurangens sida."*
- Skeleton loaders while loading, Swedish error messages on failure

### API Endpoints (mocked)
- `GET /api/v1/restaurants`
- `GET /api/v1/lunch?date=YYYY-MM-DD`
- `GET /api/v1/lunch/week?week=YYYY-WW`

---

## Phase 3: Departures – Lindholmspiren

### Features
- **Grouped by transport type**: Färja / Spårvagn / Buss
- Each departure shows: line number, destination, departure time, delay, realtime badge
- **Auto-refresh every 30 seconds** (no excessive polling)
- **Manual refresh button**
- **"Senast uppdaterad"** timestamp
- Large, high-contrast departure times for quick glancing

### API Endpoint (mocked)
- `GET /api/v1/departures/lindholmspiren?minutes=60`

---

## Phase 4: Traffic Cameras

### Features
- **Grid layout** with camera thumbnails
- **Modal view** for full-size image with focus trap, ESC to close
- Last updated timestamp per camera
- **Periodic refresh every 2–5 minutes**

### API Endpoints (mocked)
- `GET /api/v1/cameras?area=goteborg`
- `GET /api/v1/cameras/{id}`

---

## Phase 5: Navigation, UX & Accessibility

### Navigation
- Tab-based or bottom nav: **Lunch** | **Avgångar** | **Kameror**
- All routing via React Router
- Mobile-first responsive design

### UX
- Designed for "30 seconds before the tram leaves" – minimal clutter, large text
- Skeleton loaders on all data sections
- Clear Swedish error and empty states
- "Senast uppdaterad" shown everywhere relevant

### Accessibility
- Full keyboard navigation
- Proper ARIA roles and semantic HTML
- Focus trap in camera modal
- Accessible contrast ratios
- Screen-reader friendly labels

---

## Technical Notes
- **All UI text in Swedish**
- **No API keys in frontend** – all secrets are backend-side only
- **Environment support**: dev/staging/production via env vars
- **Mock mode** ships with realistic data so the app is fully functional without a backend
- **No localStorage for tokens** – auth module is a placeholder only

