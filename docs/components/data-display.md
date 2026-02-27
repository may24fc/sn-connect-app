# Data Display Components Reference

> Audience: Developers

Reusable data display components for dashboards and admin pages.

**Location:** `apps/web/src/components/data-display/`  
**Import:** `import { StatCard, BentoGrid, DataTable, EmptyState } from '@/components/data-display';`

---

## StatCard

Dashboard metric card with icon, value, label, and optional trend indicator.

```typescript
interface StatCardProps {
  title: string;          // Metric label
  value: string | number; // Primary value
  icon?: React.ReactNode; // Lucide icon
  description?: string;   // Subtitle / context
  trend?: {
    value: number;         // Percentage change
    direction: 'up' | 'down';
  };
  className?: string;
}
```

```tsx
<StatCard
  title="Active Employees"
  value={142}
  icon={<Users />}
  trend={{ value: 5, direction: 'up' }}
/>
```

---

## BentoGrid

CSS grid layout for dashboard card arrangements. Supports responsive column counts and span configurations for visually varied layouts.

```tsx
<BentoGrid>
  <BentoGrid.Item span={2}>Wide card</BentoGrid.Item>
  <BentoGrid.Item>Normal card</BentoGrid.Item>
</BentoGrid>
```

---

## DataTable

Wrapper around TanStack Table v8. Handles sorting, filtering, pagination, and column visibility.

### Key Features

- Column definitions with `columnHelper`
- Server-side or client-side pagination
- Sort indicators in column headers
- Row selection (checkbox column)
- Empty state display
- Loading skeleton rows

### Usage

```tsx
import { DataTable } from '@/components/data-display';

const columns = [
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('email', { header: 'Email' }),
  columnHelper.accessor('role', { header: 'Role', cell: (info) => <Badge>{info.getValue()}</Badge> }),
];

<DataTable data={employees} columns={columns} pagination={pagination} />
```

---

## EmptyState

Full-area empty state with icon, title, description, and optional action button.

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

```tsx
<EmptyState
  icon={<FileText />}
  title="No documents found"
  description="Upload your first document to get started."
  action={{ label: 'Upload Document', onClick: openUploader }}
/>
```

---

*Last updated: 2026-02-27*
