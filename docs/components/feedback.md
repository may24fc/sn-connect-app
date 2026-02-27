# Feedback Components Reference

> Audience: Developers

Loading skeletons and empty states for consistent fallback UI across the app.

**Location:** `apps/web/src/components/feedback/`  
**Import:** `import { SkeletonCard, SkeletonTable, EmptyState } from '@/components/feedback';`

---

## SkeletonCard

Card-shaped loading placeholder using the `Skeleton` primitive. Matches the dimensions of common cards (stat cards, task cards, etc.).

```tsx
<SkeletonCard />           {/* Default card size */}
<SkeletonCard lines={3} /> {/* Card with 3 text line skeletons */}
```

---

## SkeletonTable

Table-shaped loading placeholder with configurable rows and columns. Matches `DataTable` dimensions.

```tsx
<SkeletonTable rows={5} columns={4} />
```

---

## EmptyState

Page-level empty state display with icon, heading, and description.

```tsx
<EmptyState
  title="No tasks assigned"
  description="You don't have any tasks yet."
/>
```

---

*Last updated: 2026-02-27*
