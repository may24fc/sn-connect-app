# HR Portal (apps/web) UI/UX Enhancement Checklist

> Generated: March 7, 2026  
> Based on: Playwright audit results + manual code review  
> Focus areas: SlidePanel sizing, UI consistency, accessibility, responsiveness

---

## Executive Summary

The HR Portal (`apps/web`) is a feature-rich application with ~65 pages across employee, admin, super-admin, and intern routes. The Playwright audit identified several areas for improvement, with **SlidePanel sizing** being the primary concern highlighted by stakeholders.

### Key Findings

| Category | Issues Found | Priority |
|----------|-------------|----------|
| SlidePanel Sizing | Too narrow for complex forms | 🔴 High |
| Responsiveness | Mobile layout issues on some pages | 🟡 Medium |
| Accessibility | Missing labels, focus indicators | 🟡 Medium |
| UI Consistency | Button/form styling variations | 🟢 Low |
| Performance | Auth redirect timeouts | 🟡 Medium |

---

## Phase 1: SlidePanel Component Improvements (HIGH PRIORITY)

### Current State

The `SlidePanel` component in `packages/ui/src/primitives/slide-panel.tsx` currently supports 4 sizes:

```typescript
const sizeMap = {
  sm: 'max-w-sm', // 384px
  md: 'max-w-md', // 448px
  lg: 'max-w-lg', // 512px - MOST COMMONLY USED
  xl: 'max-w-xl', // 576px
};
```

**Problem:** The `lg` size (512px) is used for complex forms with:
- Multiple columns (`grid-cols-2`)
- Long text areas
- Rich text editors
- File uploads
- Nested form sections

This results in cramped layouts, especially for:
- Job posting creation (8+ form fields)
- Application detail view (contact info, resume, interview notes)
- OKR creation (cycle selection, objectives, weights)

### Recommended Changes

#### 1.1 Add Larger Size Options

**File:** `packages/ui/src/primitives/slide-panel.tsx`

```typescript
const sizeMap: Record<NonNullable<SlidePanelContentProps['size']>, string> = {
  sm: 'max-w-sm',    // 384px - Quick actions, confirmations
  md: 'max-w-md',    // 448px - Simple forms
  lg: 'max-w-lg',    // 512px - Medium forms
  xl: 'max-w-xl',    // 576px - Current default
  '2xl': 'max-w-2xl', // 672px - Complex forms ← ADD
  '3xl': 'max-w-3xl', // 768px - Detail views ← ADD
  full: 'max-w-[calc(100vw-2rem)]', // Nearly full width ← ADD
};
```

**TypeScript type update:**
```typescript
interface SlidePanelContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
}
```

---

#### 1.2 Update Pages to Use Larger Sizes

| Page/Feature | Current Size | Recommended Size | Reason |
|--------------|-------------|------------------|--------|
| Admin Jobs - Create Job | `lg` (512px) | `2xl` (672px) | 8+ fields, 2-column grids |
| Admin Jobs - Applications Detail | `lg` (512px) | `2xl` (672px) | Resume viewer, interview notes |
| Performance - Create OKR | `lg` (512px) | `xl` (576px) | Form is manageable |
| Intern Dashboard - EOD Report | `xl` (576px) | `2xl` (672px) | Multi-section form |
| OKRs Detail - Add Key Result | `xl` (576px) | `2xl` (672px) | Complex form with targets |

**Implementation Tasks:**

- [ ] **1.2.1** Update `packages/ui/src/primitives/slide-panel.tsx` - Add new sizes
- [ ] **1.2.2** Update `apps/web/src/app/(admin)/admin/jobs/page.tsx` - Change to `size="2xl"`
- [ ] **1.2.3** Update `apps/web/src/app/(admin)/admin/jobs/applications/page.tsx` - Change to `size="2xl"`
- [ ] **1.2.4** Update `apps/web/src/app/(employee)/intern/dashboard/page.tsx` - Change to `size="2xl"`
- [ ] **1.2.5** Update `apps/web/src/app/(employee)/performance/okrs/[id]/page.tsx` - Change to `size="2xl"`

---

#### 1.3 Add Responsive Width Option

For panels that should adapt to screen size:

```typescript
// New variant for responsive panels
const responsiveSizeMap = {
  responsive: 'w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl',
};
```

- [ ] **1.3.1** Add `responsive` size option to SlidePanel
- [ ] **1.3.2** Document when to use responsive vs fixed sizes

---

## Phase 2: Mobile Responsiveness (MEDIUM PRIORITY)

### Issues Found

1. **Sidebar Collapse**: Some pages don't properly handle sidebar collapse on mobile
2. **Table Overflow**: Data tables don't scroll horizontally on narrow screens
3. **Form Grid Layouts**: `grid-cols-2` doesn't collapse to single column on mobile

### Implementation Tasks

- [ ] **2.1** Add `@media` queries to collapse `grid-cols-2` forms on mobile
- [ ] **2.2** Add horizontal scroll wrapper to data tables
- [ ] **2.3** Test all slide panels on 375px viewport (iPhone SE)
- [ ] **2.4** Ensure touch targets are at least 44x44px

---

## Phase 3: Accessibility Improvements (MEDIUM PRIORITY)

### Issues Found

1. **Focus Indicators**: Some interactive elements lack visible focus rings
2. **Button Labels**: Icon-only buttons missing `aria-label`
3. **Form Labels**: Some inputs not properly associated with labels
4. **Color Contrast**: `text-zinc-400` on white bg may not meet WCAG AA

### Implementation Tasks

- [ ] **3.1** Add `focus-visible:ring-2 focus-visible:ring-primary` to all interactive elements
- [ ] **3.2** Audit all icon buttons and add `aria-label` attributes
- [ ] **3.3** Ensure all `<input>` elements have associated `<label>` via `htmlFor`
- [ ] **3.4** Replace `text-zinc-400` with `text-zinc-500` for better contrast
- [ ] **3.5** Add skip-to-content link in main layout (if desired for accessibility)

---

## Phase 4: UI Consistency (LOW PRIORITY)

### Issues Found & Fixed ✅

#### 4.1 Page Headers Standardized — **COMPLETED**

**Standard Pattern:**
- Page headings: `text-2xl font-bold text-foreground`
- Subtitle: `text-muted-foreground`

**Files Updated:**
| File | Before | After |
|------|--------|-------|
| `(employee)/tasks/page.tsx` | `text-xl font-semibold tracking-tight` | `text-2xl font-bold text-foreground` |
| `(employee)/reports/page.tsx` | `text-headline` | `text-2xl font-bold text-foreground` |
| `(employee)/reports/[id]/page.tsx` | `text-headline` | `text-2xl font-bold text-foreground` |
| `(employee)/reports/new/page.tsx` | `text-headline` | `text-2xl font-bold text-foreground` |
| `(employee)/invoice/page.tsx` | `text-headline` | `text-2xl font-bold text-foreground` |
| `(admin)/super-admin/ai-knowledge/page.tsx` | `text-xl font-semibold` | `text-2xl font-bold text-foreground` |
| `(admin)/super-admin/tasks/page.tsx` | `text-xl font-semibold tracking-tight` | `text-2xl font-bold text-foreground` |
| `(admin)/super-admin/payroll-approvals/page.tsx` | `text-headline` | `text-2xl font-bold text-foreground` |
| `(admin)/admin/ai-knowledge/page.tsx` | `text-xl font-semibold` | `text-2xl font-bold text-foreground` |
| `(admin)/admin/reports/page.tsx` | `text-headline` | `text-2xl font-bold text-foreground` |
| `(admin)/admin/reports/[id]/page.tsx` | `text-headline` | `text-2xl font-bold text-foreground` |
| `(admin)/admin/resources/categories/page.tsx` | `text-headline` | `text-2xl font-bold text-foreground` |

#### 4.2 Search Bars Standardized — **COMPLETED**

**Standard Pattern:**
```tsx
<div className="relative flex-1">
  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-10" placeholder="Search..." value={} onChange={} />
</div>
```

**Files Updated:**
| File | Change |
|------|--------|
| `(employee)/tasks/page.tsx` | Added Search icon with relative wrapper |
| `(employee)/reports/page.tsx` | Added Search icon with relative wrapper |
| `(admin)/super-admin/tasks/page.tsx` | Added Search icon with relative wrapper |
| `(employee)/information-hub/page.tsx` | Changed from card wrapper to standard pattern |

#### 4.3 Tabs Standardized — **COMPLETED**

**Standard Pattern:** Text-only `TabsTrigger` without icons

**Files Updated:**
| File | Change |
|------|--------|
| `(employee)/information-hub/page.tsx` | Removed `Megaphone` and `BookOpen` icons from TabsTrigger |

### Remaining Tasks

- [ ] **4.4** Button Variants: Audit primary/secondary/ghost usage
- [ ] **4.5** Card Styling: Standardize to `shadow-card` across pages
- [ ] **4.6** Spacing: Align to 4px grid system

---

## Phase 5: Performance & Error Handling

### Issues Found

1. **Auth Timeouts**: Playwright tests timing out on protected routes
2. **Loading States**: Some pages lack skeleton loaders during data fetch

### Implementation Tasks

- [ ] **5.1** Add loading skeleton components to all data tables
- [ ] **5.2** Improve auth redirect logic for faster redirects
- [ ] **5.3** Add error boundaries to page components

---

## Screenshots Captured

The Playwright audit captured screenshots in `e2e/screenshots/web-audit/`:

| Screenshot | Description |
|-----------|-------------|
| `01-login-page.png` | Login page desktop |
| `01-login-page-mobile.png` | Login page mobile (375px) |
| `01-login-page-tablet.png` | Login page tablet (768px) |
| `02-signup-page.png` | Signup page |
| `02-signup-page-mobile.png` | Signup mobile |
| `03-forgot-password-page.png` | Forgot password |
| `30-admin-dashboard.png` | Admin dashboard desktop |
| `30-admin-dashboard-mobile.png` | Admin dashboard mobile |
| `34-admin-jobs.png` | Admin jobs listing |
| `34-admin-jobs-create-slide-panel.png` | **Job creation slide panel (640px width)** |
| `35-admin-job-applications.png` | Job applications board |
| `37-admin-reports.png` | Admin reports |
| `53-super-admin-tasks.png` | Super admin tasks |
| `70-onboarding-flow.png` | Onboarding wizard |
| `90-focus-indicators.png` | Focus state testing |

---

## SlidePanel Size Recommendations Summary

### Current Sizes vs Recommended

| Size | Width | Use Case |
|------|-------|----------|
| `sm` | 384px | Confirmations, quick actions, single-field edits |
| `md` | 448px | Simple forms (2-3 fields) |
| `lg` | 512px | Standard forms (4-6 fields, single column) |
| `xl` | 576px | Medium complexity forms |
| `2xl` | 672px | **Complex forms with grids, multiple sections** ← NEW |
| `3xl` | 768px | **Detail views, preview panels** ← NEW |
| `full` | 100%-2rem | **Data-heavy panels, editors** ← NEW |

### Migration Guide

When upgrading existing slide panels:

1. **Don't change panels that work well** - If content fits comfortably, keep current size
2. **Use `2xl` for forms with `grid-cols-2`** - Ensures columns don't feel cramped
3. **Use `3xl` for detail views** - Application details, employee profiles
4. **Test mobile** - Ensure panels look good on 375px width

---

## Quick Implementation Script

To update all slide panels at once, use this grep + replace pattern:

```bash
# Find all SlidePanel usages
grep -r "SlidePanelContent size=" apps/web/src --include="*.tsx"

# Current output shows:
# jobs/page.tsx:421:        <SlidePanelContent size="lg">
# applications/page.tsx:468:        <SlidePanelContent size="lg">
# performance/page.tsx:405:        <SlidePanelContent size="lg">
# intern/dashboard/page.tsx:329:        <SlidePanelContent size="xl">
# okrs/[id]/page.tsx:493:        <SlidePanelContent size="xl">
# okrs/page.tsx:371:        <SlidePanelContent size="xl">
```

---

## Testing After Changes

After implementing changes, re-run the Playwright audit:

```bash
npx playwright test e2e/web-ui-audit.spec.ts --project=chromium
```

Focus on:
1. SlidePanel width measurements printed to console
2. Screenshots in `e2e/screenshots/web-audit/`
3. Mobile responsiveness tests

---

## Priority Order

1. ✅ **Immediate**: Add `2xl`, `3xl`, `full` sizes to SlidePanel component
2. ✅ **Week 1**: Update jobs pages to use `2xl`
3. ✅ **Week 1**: Update application detail panel to use `2xl`
4. 🔲 **Week 2**: Accessibility audit and fixes
5. 🔲 **Week 3**: Mobile responsiveness improvements
6. 🔲 **Week 4**: UI consistency cleanup

---

## Files to Modify

| Priority | File | Changes |
|----------|------|---------|
| 🔴 High | `packages/ui/src/primitives/slide-panel.tsx` | Add new sizes |
| 🔴 High | `apps/web/src/app/(admin)/admin/jobs/page.tsx` | `size="2xl"` |
| 🔴 High | `apps/web/src/app/(admin)/admin/jobs/applications/page.tsx` | `size="2xl"` |
| 🟡 Med | `apps/web/src/app/(employee)/intern/dashboard/page.tsx` | `size="2xl"` |
| 🟡 Med | `apps/web/src/app/(employee)/performance/okrs/[id]/page.tsx` | `size="2xl"` |
| 🟢 Low | All form pages | Responsive grid updates |
