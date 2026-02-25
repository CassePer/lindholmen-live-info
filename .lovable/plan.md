
# Fix: "Rensa cache"-knappen och DELETE-anrop i Admin

## Problem
`supabase.functions.invoke("admin-restaurants?clear_cache=true", { method: "DELETE" })` fungerar inte -- Supabase SDK tolkar `admin-restaurants?clear_cache=true` som funktionsnamnet, inte som namn + query-parametrar. Samma problem galler aven radering av restauranger (`admin-restaurants?id=...`).

## Losning
Flytta parametrarna fran query string till request body, och uppdatera edge function att lasa fran body istallet for URL-parametrar vid DELETE.

### 1. Uppdatera edge function (`supabase/functions/admin-restaurants/index.ts`)

Andra DELETE-hanteringen sa att den laser `id` och `clear_cache` fran request body istallet for URL query params:

```typescript
if (req.method === 'DELETE') {
  const body = await req.json().catch(() => ({}));
  const clearCache = body.clear_cache;
  const id = body.id;

  if (clearCache) {
    // clear lunch_menu_cache (same logic as before)
  }

  if (!id) {
    return 400 error;
  }
  // delete restaurant by id (same logic as before)
}
```

### 2. Uppdatera AdminPage.tsx -- clearCacheMutation

Andra fran:
```typescript
supabase.functions.invoke("admin-restaurants?clear_cache=true", { method: "DELETE" })
```
Till:
```typescript
supabase.functions.invoke("admin-restaurants", {
  method: "DELETE",
  body: { clear_cache: true },
})
```

### 3. Uppdatera AdminPage.tsx -- deleteMutation

Andra fran:
```typescript
supabase.functions.invoke(`admin-restaurants?id=${id}`, { method: "DELETE" })
```
Till:
```typescript
supabase.functions.invoke("admin-restaurants", {
  method: "DELETE",
  body: { id },
})
```

### 4. Deploya och testa
- Deploya uppdaterad edge function
- Testa att "Rensa cache"-knappen ger "Cache rensad" toast
- Testa att radering av restauranger fungerar
- Verifiera att nya menyer hamtas efter cache-rensning
