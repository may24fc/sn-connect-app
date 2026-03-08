# UI Primitives Reference

> Audience: Developers

19 base UI components in `packages/ui/src/primitives/`. All are client components (`'use client'`), support `className` override via `cn()`, and use forwarded refs where applicable.

**Import:** `import { Button, Input, Badge, ... } from '@hr-portal/ui';`

---

## Button

Polymorphic button with CVA variants and Radix `Slot` support for `asChild`.

### Variants

| Variant | Description |
|---------|-------------|
| `default` | Indigo-600 filled (primary action) |
| `destructive` | Rose-600 filled (danger) |
| `outline` | Border with white/zinc background |
| `secondary` | Zinc-100 filled |
| `ghost` | Transparent, hover reveals background |
| `link` | Indigo text with underline on hover |
| `success` | Emerald-600 filled |
| `warning` | Amber-500 filled |

### Sizes

| Size | Height | Padding |
|------|--------|---------|
| `default` | h-10 | px-4 py-2 |
| `sm` | h-8 | px-3, text-xs |
| `lg` | h-12 | px-8, text-base |
| `icon` | h-10 w-10 | — |

### Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;  // Renders as child element (Radix Slot)
}
```

### Usage

```tsx
<Button variant="default" size="sm">Save</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost" size="icon"><Settings /></Button>
<Button asChild><Link href="/profile">Profile</Link></Button>
```

---

## Input

Standard text input with error state support.

### Props

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;  // Red border + ring styling
}
```

### Usage

```tsx
<Input placeholder="Search..." />
<Input type="email" error={!!errors.email} />
```

---

## PasswordInput

Input with show/hide toggle button for password fields.

### Props

```typescript
interface PasswordInputProps extends Omit<InputProps, 'type'> {}
```

### Usage

```tsx
<PasswordInput placeholder="Enter password" />
```

---

## Textarea

Multi-line text input extending native textarea. Minimum height: 80px.

### Props

```typescript
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
```

---

## Badge

Inline status/label badge with CVA variants. Rendered as `<div>`.

### Variants

| Variant | Style |
|---------|-------|
| `default` | Indigo filled |
| `secondary` | Zinc-100/800 subtle |
| `destructive` | Rose filled |
| `success` | Emerald subtle |
| `warning` | Amber subtle |
| `error` | Rose subtle |
| `outline` | Border only |
| `pending` | Amber subtle (same as warning) |
| `approved` | Emerald subtle (same as success) |
| `rejected` | Rose subtle (same as error) |
| `indigo` | Indigo subtle |

### Usage

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="pending">Pending Review</Badge>
```

---

## Avatar

Radix avatar with image and fallback. Three exported components.

| Component | Description |
|-----------|-------------|
| `Avatar` | Root container |
| `AvatarImage` | Image within avatar |
| `AvatarFallback` | Shown when image fails to load |

### Usage

```tsx
<Avatar>
  <AvatarImage src={user.avatarUrl} alt={user.name} />
  <AvatarFallback>{user.initials}</AvatarFallback>
</Avatar>
```

---

## Card

Container card with sub-components. No Radix dependency.

| Component | Padding | Description |
|-----------|---------|-------------|
| `Card` | — | Root container with border, shadow, hover shadow transition |
| `CardHeader` | p-6 | Header section |
| `CardTitle` | — | Heading (h3), semibold, tight tracking |
| `CardDescription` | — | Muted description text |
| `CardContent` | p-6 pt-0 | Main content area |
| `CardFooter` | p-6 pt-0 | Footer with flex-row alignment |

---

## Dialog

Full-featured modal dialog wrapping `@radix-ui/react-dialog`. Includes overlay, portal, animation, and close button (X icon).

| Component | Description |
|-----------|-------------|
| `Dialog` | Root (controlled/uncontrolled) |
| `DialogTrigger` | Open trigger |
| `DialogPortal` | Portals to body |
| `DialogOverlay` | Semi-transparent black overlay |
| `DialogContent` | Centered content with max-w-lg, auto close button |
| `DialogHeader` | Header layout |
| `DialogFooter` | Footer layout (flex-col-reverse → sm:flex-row) |
| `DialogTitle` | Title text |
| `DialogDescription` | Description text |
| `DialogClose` | Close trigger |

### Usage

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>Update your information</DialogDescription>
    </DialogHeader>
    {/* content */}
    <DialogFooter>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Select

Dropdown select wrapping `@radix-ui/react-select`. Includes scroll buttons and check indicator.

| Component | Description |
|-----------|-------------|
| `Select` | Root |
| `SelectTrigger` | Click-to-open trigger (h-10) |
| `SelectValue` | Selected value display |
| `SelectContent` | Dropdown panel (portaled) |
| `SelectGroup` | Option group |
| `SelectLabel` | Group label |
| `SelectItem` | Selectable option with check mark |
| `SelectSeparator` | Divider line |
| `SelectScrollUpButton` | Top scroll indicator |
| `SelectScrollDownButton` | Bottom scroll indicator |

### Usage

```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select department" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="engineering">Engineering</SelectItem>
    <SelectItem value="marketing">Marketing</SelectItem>
  </SelectContent>
</Select>
```

---

## DropdownMenu

Context menu / action menu wrapping `@radix-ui/react-dropdown-menu`.

| Component | Description |
|-----------|-------------|
| `DropdownMenu` | Root |
| `DropdownMenuTrigger` | Trigger element |
| `DropdownMenuContent` | Menu panel |
| `DropdownMenuItem` | Menu item |
| `DropdownMenuCheckboxItem` | Toggleable item |
| `DropdownMenuRadioItem` | Radio selection item |
| `DropdownMenuLabel` | Section label |
| `DropdownMenuSeparator` | Divider |
| `DropdownMenuShortcut` | Keyboard shortcut hint |
| `DropdownMenuGroup` | Item group |
| `DropdownMenuSub` | Sub-menu root |
| `DropdownMenuSubTrigger` | Sub-menu trigger |
| `DropdownMenuSubContent` | Sub-menu content |
| `DropdownMenuRadioGroup` | Group for radio items |
| `DropdownMenuPortal` | Portal wrapper |

---

## Checkbox

Radix checkbox with check indicator (Lucide `Check` icon).

```tsx
<Checkbox checked={agreed} onCheckedChange={setAgreed} />
```

---

## Label

Radix label primitive for form fields.

```tsx
<Label htmlFor="email">Email</Label>
```

---

## Progress

Radix progress bar. Value prop sets fill width as percentage.

```tsx
<Progress value={75} /> {/* 75% filled */}
```

---

## Tabs

Radix tabs for tabbed content.

| Component | Description |
|-----------|-------------|
| `Tabs` | Root (value, onValueChange) |
| `TabsList` | Tab button container |
| `TabsTrigger` | Individual tab button |
| `TabsContent` | Content panel for a tab |

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
  <TabsContent value="details">...</TabsContent>
</Tabs>
```

---

## Table

Styled HTML table sub-components. No Radix dependency.

| Component | HTML Element |
|-----------|-------------|
| `Table` | `<table>` |
| `TableHeader` | `<thead>` |
| `TableBody` | `<tbody>` |
| `TableFooter` | `<tfoot>` |
| `TableHead` | `<th>` |
| `TableRow` | `<tr>` |
| `TableCell` | `<td>` |
| `TableCaption` | `<caption>` |

---

## Separator

Radix separator. Horizontal by default, supports `orientation="vertical"`.

```tsx
<Separator />
<Separator orientation="vertical" className="h-6" />
```

---

## Skeleton

Loading placeholder with shimmer animation (2s infinite gradient sweep).

```tsx
<Skeleton className="h-4 w-48" />
<Skeleton className="h-10 w-full" />
```

---

## Toast

Custom toast notification system with provider context.

### Variants

`default`, `success`, `error`, `warning`

### API

```typescript
const { addToast, updateToast, removeToast } = useToast();

// Show a success toast (auto-dismisses after 5s by default)
addToast({ title: 'Saved', description: 'Changes saved successfully', variant: 'success' });

// Show a persistent error toast
addToast({ title: 'Error', description: 'Failed to save', variant: 'error', duration: 0 });

// Update an existing toast
updateToast(id, { description: 'Retrying...' });
```

### Setup

Wrap your app with `<ToastProvider>`:

```tsx
<ToastProvider>
  <App />
</ToastProvider>
```

---

## Tooltip

Radix tooltip. Must be wrapped in `<TooltipProvider>`.

| Component | Description |
|-----------|-------------|
| `TooltipProvider` | Context provider (wrap app or section) |
| `Tooltip` | Root |
| `TooltipTrigger` | Element that triggers tooltip |
| `TooltipContent` | Tooltip popup content |

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>Tooltip text</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## Utility: `cn()`

Tailwind class merge utility combining `clsx` and `tailwind-merge`. Resolves conflicting classes.

```typescript
import { cn } from '@hr-portal/ui';

cn('px-4 py-2', 'px-8')  // → 'py-2 px-8' (px-4 overridden)
cn('text-sm', condition && 'text-lg')  // conditional classes
```

---

*Last updated: 2026-02-27*
