# Banks API

> Audience: Developers

Read-only endpoint to list available banks from the `bank_registry` table. Used for bank selection dropdowns in payroll and profile forms. Supports filtering by country code and returns aggressively cached responses.

**Database tables:** `bank_registry`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/banks` | Any authenticated | List active banks |

---

## GET /api/banks

List all active banks from the registry, sorted alphabetically by name. Optionally filter by country code.

### Authentication

Any authenticated user (no role restriction).

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `country_code` | string | — | Filter by country (also includes `GLOBAL` banks) |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "bank_name": "Bank of the Philippine Islands",
      "bank_code": "BPI",
      "swift_code": "BOPIPHMM",
      "country_code": "PH"
    },
    {
      "id": "uuid",
      "bank_name": "PayPal",
      "bank_code": "PAYPAL",
      "swift_code": null,
      "country_code": "GLOBAL"
    }
  ]
}
```

### Caching

Response includes aggressive cache headers:
- `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
- CDN caches for 1 hour, serves stale for up to 24 hours while revalidating

---

*Last updated: 2026-03-08*
