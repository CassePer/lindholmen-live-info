# API Contract – Lindholmen Live

All endpoints are prefixed with `/api/v1`. The API is versioned; when breaking changes are introduced, a new version (`/api/v2`) will be added.

## Error shape (all endpoints)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resursen hittades inte."
  }
}
```

HTTP status codes follow standard conventions: 200, 400, 404, 500.

---

## Lunch

### `GET /api/v1/restaurants`

Returns all restaurants.

**Response** `200 OK`

```json
[
  {
    "id": "1",
    "name": "Kårrestaurangen",
    "websiteUrl": "https://kar.chalmers.se",
    "address": "Lindholmen",
    "tags": ["vegetarisk", "kött"]
  }
]
```

### `GET /api/v1/lunch?date=YYYY-MM-DD`

Returns lunch menus for the specified date.

**Query params**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| date | string | Yes | Date in YYYY-MM-DD format |

**Response** `200 OK`

```json
[
  {
    "restaurantId": "1",
    "restaurantName": "Kårrestaurangen",
    "websiteUrl": "https://kar.chalmers.se",
    "date": "2026-02-24",
    "dishes": [
      { "name": "Stekt kycklingfilé med potatis", "tags": ["kött"] }
    ],
    "sourceUrl": "https://kar.chalmers.se/lunch",
    "updatedAt": "2026-02-24T10:00:00Z"
  }
]
```

### `GET /api/v1/lunch/week?week=YYYY-WW`

Returns weekly menus.

**Query params**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| week | string | Yes | ISO week in YYYY-WNN format |

**Response** `200 OK`

```json
[
  {
    "restaurantId": "1",
    "restaurantName": "Kårrestaurangen",
    "websiteUrl": "https://kar.chalmers.se",
    "week": "2026-W09",
    "days": [
      {
        "date": "2026-02-23",
        "dayName": "Måndag",
        "dishes": [{ "name": "Pannbiff med gräddsås", "tags": ["kött"] }]
      }
    ],
    "sourceUrl": "https://kar.chalmers.se/lunch",
    "updatedAt": "2026-02-24T10:00:00Z"
  }
]
```

---

## Departures

### `GET /api/v1/departures/lindholmspiren?minutes=60`

Returns upcoming departures from Lindholmspiren.

**Query params**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| minutes | number | No | 60 | Time window in minutes |

**Response** `200 OK`

```json
{
  "departures": [
    {
      "id": "d1",
      "line": "286",
      "destination": "Stenpiren",
      "scheduledTime": "12:05",
      "estimatedTime": "12:05",
      "delayMinutes": 0,
      "isRealtime": true,
      "transportType": "Färja"
    }
  ],
  "updatedAt": "2026-02-24T12:00:00Z"
}
```

**Transport types**: `Färja`, `Spårvagn`, `Buss`

---

## Cameras

### `GET /api/v1/cameras?area=goteborg`

Returns all traffic cameras in the area.

**Query params**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| area | string | Yes | Area filter |

**Response** `200 OK`

```json
[
  {
    "id": "c1",
    "name": "Älvsborgsbron",
    "location": "Göteborg",
    "thumbnailUrl": "https://...",
    "fullImageUrl": "https://...",
    "updatedAt": "2026-02-24T12:00:00Z"
  }
]
```

### `GET /api/v1/cameras/{id}`

Returns a single camera with full details.

**Response** `200 OK`

```json
{
  "id": "c1",
  "name": "Älvsborgsbron",
  "location": "Göteborg",
  "thumbnailUrl": "https://...",
  "fullImageUrl": "https://...",
  "updatedAt": "2026-02-24T12:00:00Z",
  "description": "Trafikamera vid Älvsborgsbron, Göteborg."
}
```
