# Invoices API

> Audience: Developers

Invoice management with a draft → submitted → approved/rejected/paid lifecycle. Employees create and submit invoices; admins review and approve for payroll processing.

**Related hooks:** `useInvoices`  
**Zod schema:** `apps/web/src/lib/schemas/invoice.schema.ts`  
**Database tables:** `invoices`, `invoice_line_items`

---

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/invoices` | Any (scoped) | List invoices |
| `POST` | `/api/invoices` | Any authenticated | Create invoice with line items |
| `GET` | `/api/invoices/[id]` | Any (RLS) | Get invoice detail |
| `PATCH` | `/api/invoices/[id]` | Any (RLS) | Update invoice |
| `POST` | `/api/invoices/[id]/submit` | Any authenticated | Submit for approval |
| `POST` | `/api/invoices/[id]/approve` | admin, super_admin | Approve or reject |

---

## GET /api/invoices

List invoices with pagination. Non-admins see only their own invoices.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | `string` | — | `draft`, `submitted`, `approved`, `paid`, `rejected` |
| `employeeId` | `uuid` | — | Filter by employee (admin only) |
| `page` | `number` | `1` | Page number |
| `pageSize` | `number` | `10` | Results per page |

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "invoice_number": "INV-2026-001",
      "period_start": "2026-02-01",
      "period_end": "2026-02-28",
      "gross_amount": 50000.00,
      "deductions": 5000.00,
      "net_amount": 45000.00,
      "source_currency": "PHP",
      "target_currency": "PHP",
      "exchange_rate": null,
      "converted_amount": null,
      "status": "submitted",
      "notes": null,
      "submitted_at": "2026-02-27T10:00:00Z",
      "employees": {
        "first_name": "Juan",
        "last_name": "Dela Cruz"
      }
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 3, "totalPages": 1 }
}
```

> **Payroll sensitivity:** Invoice amounts contain compensation data. These fields must never appear in logs or error messages.

---

## POST /api/invoices

Create an invoice with line items.

### Request Body (Zod: `invoiceCreateSchema`)

```json
{
  "invoiceNumber": "INV-2026-001",
  "periodStart": "2026-02-01",
  "periodEnd": "2026-02-28",
  "grossAmount": 50000.00,
  "deductions": 5000.00,
  "netAmount": 45000.00,
  "status": "draft",
  "notes": null,
  "sourceCurrency": "PHP",
  "targetCurrency": "PHP",
  "exchangeRate": null,
  "convertedAmount": null,
  "lineItems": [
    {
      "description": "Development services — Feb 2026",
      "quantity": 1,
      "unitPrice": 50000.00,
      "total": 50000.00
    }
  ]
}
```

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `invoiceNumber` | `string` | Yes | — | Min 1 character |
| `periodStart` | `string` | Yes | — | `YYYY-MM-DD` |
| `periodEnd` | `string` | Yes | — | `YYYY-MM-DD` |
| `grossAmount` | `number` | Yes | — | Non-negative |
| `deductions` | `number` | No | `0` | Non-negative |
| `netAmount` | `number` | Yes | — | Non-negative |
| `status` | `enum` | No | `"draft"` | `draft`, `submitted`, `approved`, `paid`, `rejected` |
| `notes` | `string` | No | `null` | |
| `sourceCurrency` | `string` | No | `"PHP"` | 3-character ISO currency code |
| `targetCurrency` | `string` | No | `"PHP"` | 3-character ISO currency code |
| `exchangeRate` | `number` | No | `null` | Positive |
| `convertedAmount` | `number` | No | `null` | Non-negative |
| `lineItems` | `array` | No | `[]` | Array of line item objects |
| `employeeId` | `uuid` | No | Auto | Admin can specify; non-admin auto-set |

#### Line Item Object

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| `description` | `string` | Yes | — | Min 1 character |
| `quantity` | `number` | No | `1` | Positive |
| `unitPrice` | `number` | Yes | — | Non-negative |
| `total` | `number` | Yes | — | Non-negative |

### Response

**201 Created**

```json
{
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2026-001",
    "employee_id": "uuid",
    "status": "draft"
  }
}
```

---

## GET /api/invoices/[id]

Get invoice detail with employee info and line items.

### Response

```json
{
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "invoice_number": "INV-2026-001",
    "period_start": "2026-02-01",
    "period_end": "2026-02-28",
    "gross_amount": 50000.00,
    "deductions": 5000.00,
    "net_amount": 45000.00,
    "source_currency": "PHP",
    "target_currency": "PHP",
    "status": "draft",
    "employees": {
      "first_name": "Juan",
      "last_name": "Dela Cruz"
    },
    "invoice_line_items": [
      {
        "id": "uuid",
        "description": "Development services — Feb 2026",
        "quantity": 1,
        "unit_price": 50000.00,
        "total": 50000.00
      }
    ]
  }
}
```

---

## PATCH /api/invoices/[id]

Update invoice fields and optionally replace all line items.

### Request Body (Zod: `invoiceUpdateSchema`)

Partial — only include fields to update:

```json
{
  "notes": "Updated invoice",
  "lineItems": [
    {
      "description": "Development services — Feb 2026 (revised)",
      "quantity": 1,
      "unitPrice": 55000.00,
      "total": 55000.00
    }
  ]
}
```

When `lineItems` is provided, all existing line items are deleted and replaced.

---

## POST /api/invoices/[id]/submit

Submit a draft invoice for admin approval.

### Behavior

Sets `status` to `"submitted"` and `submitted_at` to current timestamp.

### Response

```json
{
  "data": {
    "id": "uuid",
    "status": "submitted",
    "submitted_at": "2026-02-27T10:00:00Z"
  }
}
```

---

## POST /api/invoices/[id]/approve

Approve or reject a submitted invoice.

### Authentication

Requires `admin` or `super_admin` role.

### Request Body (Zod: `invoiceApprovalSchema`)

```json
{
  "action": "approved",
  "notes": "Verified and approved for payment"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | `enum` | Yes | `"approved"` or `"rejected"` |
| `notes` | `string` | No | Reviewer comments |

### Response

```json
{
  "data": {
    "id": "uuid",
    "status": "approved",
    "reviewed_at": "2026-02-27T11:00:00Z",
    "reviewed_by": "admin-employee-uuid",
    "reviewer_notes": "Verified and approved for payment"
  }
}
```

---

## Invoice Lifecycle

```
draft → submitted → approved → paid
                  → rejected → draft (revise & resubmit)
```

---

## Zod Schemas

```typescript
// invoice.schema.ts
const invoiceStatusSchema = z.enum(['draft', 'submitted', 'approved', 'paid', 'rejected']);

const invoiceLineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

const invoiceCreateSchema = z.object({
  employeeId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grossAmount: z.number().nonnegative(),
  deductions: z.number().nonnegative().default(0),
  netAmount: z.number().nonnegative(),
  status: invoiceStatusSchema.default('draft'),
  notes: z.string().optional().nullable(),
  lineItems: z.array(invoiceLineItemSchema).default([]),
  sourceCurrency: z.string().length(3).default('PHP'),
  targetCurrency: z.string().length(3).default('PHP'),
  exchangeRate: z.number().positive().optional().nullable(),
  convertedAmount: z.number().nonnegative().optional().nullable(),
});

const invoiceApprovalSchema = z.object({
  action: z.enum(['approved', 'rejected']).default('approved'),
  notes: z.string().optional().nullable(),
});
```

---

*Last updated: 2026-02-27*
