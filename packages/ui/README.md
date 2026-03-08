# @hr-portal/ui

Shared UI component library for the SN Connect HR Portal. Built on Radix UI, Tailwind CSS, and CVA.

## Installation

Available via pnpm workspaces:

```typescript
import { Button, Input, Badge, Card, Dialog } from '@hr-portal/ui';
```

## Structure

```
src/
├── primitives/     # 19 Radix-based base components
├── components/     # Composite components by domain
│   ├── ai-knowledge/  # AI chat & knowledge management (14)
│   ├── announcements/ # Announcement CRUD & analytics (9)
│   ├── dashboard/     # Dashboard cards (1)
│   ├── forms/         # React Hook Form wrappers (8)
│   ├── internship/    # Intern tracking & daily logs (8)
│   ├── performance/   # OKR, KPI, review components (6)
│   ├── reports/       # Weekly reports & analytics (14+)
│   ├── resources/     # Resource library UI (12)
│   └── tasks/         # Task management (10)
├── layout/         # Header, Sidebar (2)
├── types/          # Shared type definitions
└── utils/          # cn() utility
```

## Primitives (19)

Avatar, Badge, Button, Card, Checkbox, Dialog, DropdownMenu, Input, Label, PasswordInput, Progress, Select, Separator, Skeleton, Table, Tabs, Textarea, Toast, Tooltip

## Design System

**Titanium & Indigo** — see `apps/web/tailwind.config.ts`

- Primary: Indigo-600 (`#4F46E5`)
- Background: Zinc-50 / Zinc-950
- Base font: 14px Inter
- All components support dark mode

## Documentation

- [Primitives Reference](../../docs/components/primitives.md)
- [Component Index](../../docs/components/README.md)
