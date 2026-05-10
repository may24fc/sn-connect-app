# Resources Components Documentation

This document covers the UI components for the Resources / Information Hub feature. Components are located in `packages/ui/src/components/resources/` and follow the project's design system (Navy & Gold, zinc palette) with CVA for variant styling.

> **Note:** Component implementations are in progress (Task #2). This document describes the planned component API based on the data layer and API contracts already implemented.

## Table of Contents

- [ResourceCard](#resourcecard)
- [ResourceGrid](#resourcegrid)
- [ResourceFilters](#resourcefilters)
- [ResourceSearch](#resourcesearch)
- [ResourceUploadForm](#resourceuploadform)
- [ResourceDetailPanel](#resourcedetailpanel)
- [ResourceAnalyticsCard](#resourceanalyticscard)
- [Design System Compliance](#design-system-compliance)
- [Accessibility](#accessibility)

---

## ResourceCard

Displays a single resource as a card with type icon, category badge, title, excerpt, and engagement metrics.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resource` | `Resource` | Required | Resource data object |
| `variant` | `'default'` \| `'compact'` \| `'featured'` | `'default'` | Card layout variant |
| `onBookmark` | `(id: string) => void` | -- | Bookmark toggle callback |
| `isBookmarked` | `boolean` | `false` | Whether user has bookmarked this resource |
| `onView` | `(id: string) => void` | -- | Called when card is clicked |
| `className` | `string` | -- | Additional CSS classes |

### Usage

```tsx
import { ResourceCard } from '@/components/resources/ResourceCard';

<ResourceCard
  resource={resource}
  variant="featured"
  isBookmarked={bookmarkedIds.has(resource.id)}
  onBookmark={(id) => toggleBookmark(id)}
  onView={(id) => router.push(`/resources/${id}`)}
/>
```

### Variants

- **default** -- Standard card with thumbnail, title, excerpt, category badge, and view count
- **compact** -- Smaller card without thumbnail, used in sidebar lists and bookmarks
- **featured** -- Larger card with prominent thumbnail and highlighted border (Indigo-600)

### Design Notes

- Category badge uses `resourceCategorySchema` values mapped to color tokens
- Resource type icon from Lucide React (Video, FileText, Image, Link, Presentation, MousePointer)
- Engagement metrics (views, downloads, bookmarks) shown in Zinc-500 muted text
- Card background: white (light) / Zinc-900 (dark), border: Zinc-200 / Zinc-800

---

## ResourceGrid

Responsive grid layout for rendering multiple ResourceCards.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resources` | `Resource[]` | Required | Array of resources to render |
| `variant` | `'default'` \| `'compact'` | `'default'` | Card variant to use |
| `isLoading` | `boolean` | `false` | Show skeleton loading state |
| `emptyMessage` | `string` | `'No resources found'` | Message when array is empty |
| `onBookmark` | `(id: string) => void` | -- | Passed through to ResourceCard |
| `bookmarkedIds` | `Set<string>` | -- | Set of bookmarked resource IDs |
| `onView` | `(id: string) => void` | -- | Passed through to ResourceCard |
| `className` | `string` | -- | Additional CSS classes |

### Usage

```tsx
import { ResourceGrid } from '@/components/resources/ResourceGrid';

<ResourceGrid
  resources={data}
  isLoading={isLoading}
  bookmarkedIds={bookmarkedIds}
  onBookmark={toggleBookmark}
  onView={(id) => router.push(`/resources/${id}`)}
/>
```

### Layout

- Default grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Compact grid: `grid-cols-1 gap-3`
- Loading state: 6 skeleton cards matching the grid layout

---

## ResourceFilters

Filter controls for category, resource type, and tags.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `filters` | `ResourceFeedFiltersInput` | Required | Current filter values |
| `onFiltersChange` | `(filters: ResourceFeedFiltersInput) => void` | Required | Filter change callback |
| `showStatusFilter` | `boolean` | `false` | Show status filter (admin only) |
| `className` | `string` | -- | Additional CSS classes |

### Usage

```tsx
import { ResourceFilters } from '@/components/resources/ResourceFilters';

<ResourceFilters
  filters={filters}
  onFiltersChange={setFilters}
  showStatusFilter={isAdmin}
/>
```

### Filter Controls

- **Category** -- Select dropdown using `RESOURCE_CATEGORIES` constants with descriptions
- **Resource Type** -- Select dropdown using `RESOURCE_TYPES` constants with icons
- **Status** -- Select dropdown (admin only): draft, published, archived
- **Tags** -- Multi-select or tag input for filtering by tags
- **Clear All** -- Button to reset all filters to defaults

---

## ResourceSearch

Search input with debouncing for full-text resource search.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | `''` | Current search value |
| `onChange` | `(value: string) => void` | Required | Search change callback |
| `placeholder` | `string` | `'Search resources...'` | Input placeholder |
| `debounceMs` | `number` | `300` | Debounce delay in milliseconds |
| `className` | `string` | -- | Additional CSS classes |

### Usage

```tsx
import { ResourceSearch } from '@/components/resources/ResourceSearch';

<ResourceSearch
  value={searchQuery}
  onChange={setSearchQuery}
  debounceMs={300}
/>
```

### Design Notes

- Uses Lucide `Search` icon as input prefix
- Minimum 2 characters before triggering search (per `resourceSearchSchema`)
- Clear button appears when input has value

---

## ResourceUploadForm

Form for uploading new resources with file upload and metadata entry. Admin only.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSuccess` | `(resource: Resource) => void` | -- | Called after successful creation |
| `onCancel` | `() => void` | -- | Cancel callback |
| `defaultCategory` | `ResourceCategory` | -- | Pre-select category |

### Usage

```tsx
import { ResourceUploadForm } from '@/components/resources/ResourceUploadForm';

<ResourceUploadForm
  onSuccess={(resource) => {
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    router.push(`/resources/${resource.id}`);
  }}
  onCancel={() => router.back()}
/>
```

### Form Fields

Maps to `createResourceSchema` validation. Two-step flow:
1. Upload file via `POST /api/resources/upload` to get `filePath`
2. Create resource via `POST /api/resources` with metadata + `filePath`

---

## ResourceDetailPanel

Full resource detail view with download, bookmark, and view tracking.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resourceId` | `string` | Required | Resource UUID |
| `onClose` | `() => void` | -- | Close panel callback |

### Usage

```tsx
import { ResourceDetailPanel } from '@/components/resources/ResourceDetailPanel';

<ResourceDetailPanel
  resourceId={selectedId}
  onClose={() => setSelectedId(null)}
/>
```

### Behavior

- Automatically calls `POST /api/resources/:id/view` on mount to track view
- Shows download button for file resources, external link for URL resources
- Displays bookmark toggle with personal notes input
- Shows related resources by same category

---

## ResourceAnalyticsCard

Analytics summary card for admin dashboard. Displays view count, download count, bookmark count, unique viewers, completion rate, and a 30-day time series chart.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resourceId` | `string` | Required | Resource UUID |
| `className` | `string` | -- | Additional CSS classes |

### Usage

```tsx
import { ResourceAnalyticsCard } from '@/components/resources/ResourceAnalyticsCard';

<ResourceAnalyticsCard resourceId={resource.id} />
```

### Data Source

Fetches from `GET /api/resources/:id/analytics`. Uses Recharts for the time series line chart.

---

## Design System Compliance

All resource components follow the Navy & Gold design system (zinc palette):

- **Primary color:** Zinc-900 (Navy) for primary actions and highlights
- **Accent:** Gold-500 for featured highlights
- **Backgrounds:** White / Zinc-900 for cards, Zinc-50 / Zinc-950 for page background
- **Borders:** Zinc-200 / Zinc-800
- **Text:** Zinc-900 / Zinc-50 for primary, Zinc-500 for muted/secondary
- **Typography:** 14px base, Source Sans 3 body + Lexend headings, -0.01em heading tracking
- **Spacing:** Consistent with existing component library (p-4 cards, gap-6 grids)
- **Variants:** Use CVA (class-variance-authority) for component variants
- **Icons:** Lucide React icon set

## Accessibility

- All interactive elements have appropriate `aria-label` attributes
- ResourceCard uses `role="article"` with descriptive `aria-label`
- Filter dropdowns use Radix UI Select primitives with built-in keyboard navigation
- Search input has `role="searchbox"` and `aria-label="Search resources"`
- Bookmark toggle has `aria-pressed` state
- Loading skeletons use `aria-busy="true"`
- Color contrast meets WCAG 2.1 AA standards (Zinc-900 on white, Zinc-50 on Zinc-900)
