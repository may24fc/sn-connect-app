# SN HR Portal UI Architecture Guide

This guide is for developers who need to understand the UI structure, component organization, and patterns used in the SN HR Portal.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Application Routes](#application-routes)
3. [Layout System](#layout-system)
4. [UI Component Library](#ui-component-library)
5. [State Management](#state-management)
6. [Styling Approach](#styling-approach)
7. [Type Definitions](#type-definitions)

---

## Project Structure

The portal follows a monorepo structure with separate packages:

```
sn-hr-portal/
├── apps/
│   └── web/                    # Next.js application
│       └── src/
│           └── app/            # App router pages
│               ├── (auth)/     # Authentication routes
│               ├── (employee)/ # Employee & Intern portal routes
│               └── (admin)/    # Admin & Super Admin routes
│                   └── super-admin/ # Super Admin-only routes (passthrough layout)
├── packages/
│   └── ui/                     # Shared UI component library
│       └── src/
│           ├── primitives/     # Base shadcn/ui components
│           ├── components/     # Domain-specific components (by folder)
│           ├── layout/         # Layout components (Sidebar, Header, ToastProvider)
│           └── types/          # Shared TypeScript types
└── docs/
    └── guides/                 # User and developer documentation
```

---

## Application Routes

### Route Groups

Next.js route groups organize pages by user role:

| Route Group | Path Prefix | Layout | User Roles |
|-------------|-------------|--------|------------|
| `(auth)` | `/` | Auth layout | Unauthenticated |
| `(employee)` | `/` | Employee layout | Employee, Intern |
| `(admin)` | `/` | Admin layout | Admin, Super Admin |

### Complete Route Map

```
/                          # Root redirect
/login                     # (auth) Login page
/forgot-password           # (auth) Password recovery

# ═══════════════════════════════════════════════════════════════════
# EMPLOYEE ROUTES (variant="employee")
# ═══════════════════════════════════════════════════════════════════
/dashboard                 # (employee) Employee dashboard
/files                     # (employee) 201 document management
/onboarding                # (employee) Onboarding checklists
/payroll                   # (employee) Invoice submission
/announcements             # (employee) Information hub
/profile                   # (employee) User profile
/performance               # (employee) Performance overview
/performance/okrs          # (employee) OKR management
/performance/kpis          # (employee) KPI tracking
/performance/review        # (employee) Self-assessment

# ═══════════════════════════════════════════════════════════════════
# MANAGER ROUTES (variant="manager")
# Same as employee + additional team management pages
# ═══════════════════════════════════════════════════════════════════
/manager/team-performance  # (employee) Team performance view
/manager/reviews           # (employee) Pending reviews queue

# ═══════════════════════════════════════════════════════════════════
# INTERN ROUTES (variant="intern")
# Similar to employee but NO /payroll, different dashboard
# ═══════════════════════════════════════════════════════════════════
/intern/dashboard          # (employee) Intern-specific dashboard
/intern/reports            # (employee) Daily EOD reports
/files                     # (employee) 201 document management
/onboarding                # (employee) Onboarding checklists
/performance               # (employee) Performance overview
/announcements             # (employee) Information hub
/profile                   # (employee) User profile
# NOTE: Interns do NOT have access to /payroll

# ═══════════════════════════════════════════════════════════════════
# ADMIN ROUTES (variant="admin")
# HR Admin - full HR access + manager capabilities (except invoices)
# ═══════════════════════════════════════════════════════════════════
/probation                 # (admin) Probation tracker
/admin-performance         # (admin) Performance admin
/admin-performance/cycles  # (admin) Performance cycles
/manager/team-performance  # (employee) Team performance view [MANAGER]
/manager/reviews           # (employee) Employee reviews queue [MANAGER]
/interns                   # (admin) Intern management
/interns/[id]              # (admin) Intern detail

# ═══════════════════════════════════════════════════════════════════
# COS / SUPER ADMIN ROUTES (variant="cos")
# Same as Admin + Invoice Approvals
# ═══════════════════════════════════════════════════════════════════
/probation                 # (admin) Probation tracker
/admin-performance         # (admin) Performance admin
/admin-performance/cycles  # (admin) Performance cycles
/manager/team-performance  # (employee) Team performance view [MANAGER]
/manager/reviews           # (employee) Employee reviews queue [MANAGER]
/interns                   # (admin) Intern management
/interns/[id]              # (admin) Intern detail
/invoices                  # (admin) Invoice approvals [COS ONLY]
```

---

## Layout System

### Layout Components

Each route group has a corresponding layout component that provides:
- Sidebar navigation
- Header with user menu
- AI Chatbot integration
- Responsive container

#### Employee Layout (`apps/web/src/app/(employee)/layout.tsx`)

```typescript
export default function EmployeeLayout({ children }: { children: ReactNode }) {
  const user = useRequireAuth(['employee', 'intern']);
  const sidebarVariant = user?.role === 'intern' ? 'intern' : 'employee';

  return (
    <div className="flex h-screen bg-muted/30">
      <Sidebar variant={sidebarVariant} ... />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header ... />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
      <AIChatbot /> {/* Lazy-loaded */}
    </div>
  );
}
```

#### Admin Layout (`apps/web/src/app/(admin)/layout.tsx`)

Same structure as employee layout but serves both admin and super_admin roles:
- When user role is `'admin'`: `variant="admin"`
- When user role is `'super_admin'`: `variant="super_admin"`

```typescript
// The sidebar variant is determined by user role
const user = useRequireAuth(['admin', 'super_admin']);
<Sidebar variant={user.role} ... />
```

#### Super Admin Passthrough Layout (`apps/web/src/app/(admin)/super-admin/layout.tsx`)

A passthrough layout that enforces `super_admin` role access for all `/super-admin/*` routes. Does not render additional UI — just validates and passes children through.

### Sidebar Variants

The `Sidebar` component accepts a `variant` prop that determines navigation items:

| Variant | Navigation Items |
|---------|-----------------|
| `employee` | Dashboard, Profile, Tasks, Performance Reviews, Reports, Invoice, Documents, Information Hub |
| `intern` | Profile, Dashboard, Tasks, Performance Reviews, Documents, Information Hub (**NO Invoice or Reports**) |
| `admin` | Dashboard, Directory, Employee Management, Interns, Performance, Reports, Jobs, Announcements, AI Knowledge, Resources |
| `super_admin` | Dashboard, Directory, Employee Management, Task Management, Interns, Performance, Reports, Jobs, Announcements, AI Knowledge, Resources, Payroll Approvals |

```typescript
export type UserRole = 'employee' | 'intern' | 'admin' | 'super_admin';
```

**Note:** Admin and Super Admin share the same `(admin)` layout. The layout dynamically selects the sidebar variant based on user role. Super Admin has additional routes for Task Management and Payroll Approvals.

---

## UI Component Library

### Package: `@hr-portal/ui`

The UI package exports all components through a single entry point:

```typescript
// packages/ui/src/index.ts
export * from './primitives/button';
export * from './primitives/card';
// ... other primitives

export * from './components/AIChatbot';
export * from './components/performance/OKRCard';
// ... other components

export * from './layout/Sidebar';
export * from './layout/Header';
```

### Component Categories

#### Primitives (`packages/ui/src/primitives/`)

Base UI components built on shadcn/ui:

| Component | File | Usage |
|-----------|------|-------|
| Avatar | `avatar.tsx` | User avatars |
| Badge | `badge.tsx` | Status indicators |
| Button | `button.tsx` | Actions, links |
| Card | `card.tsx` | Content containers |
| Checkbox | `checkbox.tsx` | Boolean inputs |
| Dialog | `dialog.tsx` | Modal windows |
| DropdownMenu | `dropdown-menu.tsx` | Context menus |
| FileDropZone | `file-drop-zone.tsx` | Drag-and-drop file upload |
| Input | `input.tsx` | Text input fields |
| Label | `label.tsx` | Form labels |
| PasswordInput | `password-input.tsx` | Password fields with toggle |
| Progress | `progress.tsx` | Progress bars |
| Select | `select.tsx` | Dropdown selection |
| Separator | `separator.tsx` | Visual dividers |
| Skeleton | `skeleton.tsx` | Loading placeholders |
| SlidePanel | `slide-panel.tsx` | Sliding panel overlays |
| Table | `table.tsx` | Data tables |
| Tabs | `tabs.tsx` | Tabbed content |
| Textarea | `textarea.tsx` | Multi-line text |
| Toast | `toast.tsx` | Toast notifications |
| Tooltip | `tooltip.tsx` | Hover hints |

#### Domain Components (`packages/ui/src/components/`)

Organized by domain:

| Directory | Purpose |
|-----------|---------|
| `ai-knowledge/` | RAG chat, embeddings UI |
| `announcements/` | Announcement cards, detail dialogs |
| `dashboard/` | Dashboard-specific components |
| `documents/` | File list, upload components |
| `forms/` | Reusable form components |
| `internship/` | Intern cards, EOD report form, hours tracking |
| `notifications/` | Notification UI |
| `performance/` | OKR/KPI cards, performance charts, summary cards |
| `profile/` | Profile-related UI |
| `reports/` | Report components |
| `resources/` | Resource grid, cards |
| `tasks/` | Task list, cards |

#### Standalone Components

| Component | Purpose |
|-----------|---------|
| `AIChatbot` | AI assistant chat interface (lazy-loaded) |
| `empty-state` | Empty state display |
| `MultiSelectFilter` | Multi-select filter component |

#### Layout Components (`packages/ui/src/layout/`)

| Component | Purpose |
|-----------|---------|
| `Sidebar` | Role-based navigation |
| `Header` | Top navigation bar |
| `ToastProvider` | Toast notification provider |

---

## State Management

### Client-Side State

The application uses React's built-in state management:

```typescript
'use client';

export default function Page() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({});
  // ...
}
```

### Common State Patterns

#### Dialog State

```typescript
const [dialogOpen, setDialogOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

const handleOpen = (item: Item) => {
  setSelectedItem(item);
  setDialogOpen(true);
};
```

#### Filter State

```typescript
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState<string>('all');

const filteredItems = items.filter((item) => {
  const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
  return matchesSearch && matchesStatus;
});
```

#### Form State

```typescript
const [formData, setFormData] = useState({
  field1: '',
  field2: '',
});

const handleChange = (field: string, value: string) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};
```

---

## Styling Approach

### Tailwind CSS

The project uses Tailwind CSS with a custom design system:

```typescript
// Example component styling
<Card className="bg-gradient-to-r from-primary/5 to-primary/10">
  <CardContent className="p-6">
    <div className="flex items-center gap-4">
      {/* ... */}
    </div>
  </CardContent>
</Card>
```

### Design Tokens

Custom CSS variables define the color scheme:

| Token | Usage |
|-------|-------|
| `--primary` | Brand color, actions |
| `--success` | Positive states |
| `--warning` | Attention states |
| `--error` | Negative states |
| `--muted` | Subdued elements |
| `--sidebar` | Sidebar background |
| `--border` | Border colors |

### Utility Function: `cn()`

The `cn()` utility merges Tailwind classes conditionally:

```typescript
import { cn } from '../utils/cn';

<div className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes'
)} />
```

### Responsive Design

Tailwind breakpoints used throughout:

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |

```typescript
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {/* Responsive grid */}
</div>
```

---

## Type Definitions

### Shared Types (`packages/ui/src/types/`)

Domain types used across components:

```typescript
// Performance types
export type ReviewStatus =
  | 'pending_self'
  | 'pending_manager'
  | 'completed';

export type PerformanceCycle = {
  id: CycleId;
  name: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'active' | 'completed';
  // ...
};

export type OKR = {
  id: OKRId;
  employeeId: EmployeeId;
  cycleId: CycleId;
  objective: string;
  keyResults: KeyResult[];
  // ...
};
```

### Branded Types

Following project guidelines, IDs use branded types:

```typescript
type EmployeeId = string & { __brand: 'EmployeeId' };
type InternId = string & { __brand: 'InternId' };
type CycleId = string & { __brand: 'CycleId' };
```

### Component Props

Each component exports its props interface:

```typescript
export interface SidebarProps {
  variant: UserRole;                    // 'employee' | 'intern' | 'admin' | 'super_admin'
  currentPath: string;
  onNavigate: (href: string) => void;
  logoUrl?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}
```

---

## Adding New Features

### Adding a New Page

1. Create page file in appropriate route group:
   ```
   apps/web/src/app/(employee)/new-feature/page.tsx
   ```

2. Add navigation item to Sidebar:
   ```typescript
   // packages/ui/src/layout/Sidebar.tsx
   const employeeNavItems: NavItem[] = [
     // ...existing items
     { label: 'New Feature', href: '/new-feature', icon: NewIcon },
   ];
   ```

3. Create any required components in the UI package

### Adding a New Component

1. Create component in appropriate directory:
   ```
   packages/ui/src/components/feature/NewComponent.tsx
   ```

2. Export from package index:
   ```typescript
   // packages/ui/src/index.ts
   export * from './components/feature/NewComponent';
   ```

3. Use in pages:
   ```typescript
   import { NewComponent } from '@hr-portal/ui';
   ```

### Adding a New User Role

1. Add variant to Sidebar:
   ```typescript
   const newRoleNavItems: NavItem[] = [
     // Define navigation items
   ];
   ```

2. Update SidebarProps type
3. Create corresponding layout file
4. Add route group if needed

---

## Best Practices

### Component Guidelines

1. Use TypeScript with explicit types
2. Export props interfaces
3. Use `ReactNode` return type
4. Implement loading and error states
5. Support responsive design

### Styling Guidelines

1. Use Tailwind utility classes
2. Use `cn()` for conditional classes
3. Follow responsive breakpoint conventions
4. Use design tokens for colors

### State Guidelines

1. Prefer local state for UI concerns
2. Use controlled components for forms
3. Implement optimistic updates where appropriate
4. Handle loading and error states

---

*For user-facing documentation, see the [User Workflows Guide](./user-workflows.md).*
