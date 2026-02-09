# SN Connect Architectural Redesign Blueprint

## Executive Summary

This document provides a complete architectural plan for transforming "HR Portal" into "SN Connect"—a high-density, mission-critical enterprise operating system. The redesign enforces the "Titanium & Indigo" design system, implements the Fixed Viewport pattern, and integrates the TanStack ecosystem for professional-grade data handling.

---

## 1. Current State Analysis

### Identified Issues

| Category | Current State | Required State |
|----------|--------------|----------------|
| **Branding** | "HR Portal", "SNHR Portal" | "SN Connect" with tagline |
| **Primary Color** | Blue-500 (#3B82F6) - Default Tailwind | Indigo-600 (#4F46E5) |
| **Sidebar** | Navy (#1e3a5f) dark sidebar | White/Zinc-50 with Indigo accents |
| **Layout** | `min-h-screen` (page scroll) | `h-screen overflow-hidden` (fixed viewport) |
| **Typography** | 16px base, variable tracking | 14px dense, tight tracking |
| **Login** | Blue gradient split layout | Centered card or monochrome split |
| **Dark Mode** | Custom Navy palette | Zinc-950/900/800 scale |
| **Data Grid** | Basic lists | TanStack Table v8 |
| **State Mgmt** | Local React state | TanStack Query v5 |

### Files Requiring Modification

**Branding Updates (HR Portal to SN Connect):**
- `/apps/web/src/app/layout.tsx` - Metadata title
- `/apps/web/src/app/(auth)/login/page.tsx` - Logo, branding
- `/packages/ui/src/layout/Sidebar.tsx` - Logo, footer tagline
- `/packages/ui/src/layout/Header.tsx` - Any branding references
- `/packages/ui/src/components/AIChatbot.tsx` - Assistant branding

---

## 2. Design Token System

### `/apps/web/src/app/globals.css`

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* === TITANIUM & INDIGO DESIGN SYSTEM === */

    /* Core Surfaces (Light Mode) */
    --background: 250 250 250;           /* #FAFAFA - Zinc 50 */
    --foreground: 9 9 11;                /* #09090B - Zinc 950 */
    --card: 255 255 255;                 /* #FFFFFF - Pure White */
    --card-foreground: 24 24 27;         /* #18181B - Zinc 900 */
    --popover: 255 255 255;
    --popover-foreground: 24 24 27;

    /* Primary: Indigo (NOT Blue) */
    --primary: 79 70 229;                /* #4F46E5 - Indigo 600 */
    --primary-foreground: 255 255 255;
    --primary-hover: 67 56 202;          /* #4338CA - Indigo 700 */
    --primary-active: 55 48 163;         /* #3730A3 - Indigo 800 */
    --primary-muted: 238 242 255;        /* #EEF2FF - Indigo 50 */

    /* Secondary/Muted */
    --secondary: 244 244 245;            /* #F4F4F5 - Zinc 100 */
    --secondary-foreground: 24 24 27;
    --muted: 244 244 245;
    --muted-foreground: 113 113 122;     /* #71717A - Zinc 500 */

    /* Borders & Inputs */
    --border: 228 228 231;               /* #E4E4E7 - Zinc 200 */
    --input: 228 228 231;
    --ring: 79 70 229;                   /* Indigo 600 for focus */

    /* Semantic Colors */
    --destructive: 225 29 72;            /* #E11D48 - Rose 600 */
    --destructive-foreground: 255 255 255;
    --success: 22 163 74;                /* #16A34A - Emerald 600 */
    --success-foreground: 255 255 255;
    --warning: 245 158 11;               /* #F59E0B - Amber 500 */
    --warning-foreground: 255 255 255;
    --error: 225 29 72;                  /* #E11D48 - Rose 600 */
    --error-foreground: 255 255 255;

    /* Accents */
    --accent: 238 242 255;               /* Indigo 50 */
    --accent-foreground: 79 70 229;      /* Indigo 600 */

    /* Layout */
    --radius: 0.5rem;
    --header-height: 4rem;               /* 64px - h-16 */
    --sidebar-width: 16rem;              /* 256px - w-64 */
    --sidebar-collapsed: 4rem;           /* 64px - w-16 */

    /* Chart Colors */
    --chart-1: 79 70 229;                /* Indigo */
    --chart-2: 22 163 74;                /* Emerald */
    --chart-3: 245 158 11;               /* Amber */
    --chart-4: 168 85 247;               /* Purple 500 */
    --chart-5: 225 29 72;                /* Rose */
    --chart-6: 6 182 212;                /* Cyan 500 */
  }

  .dark {
    /* Core Surfaces (Dark Mode - Premium) */
    --background: 9 9 11;                /* #09090B - Zinc 950 */
    --foreground: 250 250 250;           /* #FAFAFA - Zinc 50 */
    --card: 24 24 27;                    /* #18181B - Zinc 900 */
    --card-foreground: 228 228 231;      /* #E4E4E7 - Zinc 200 */
    --popover: 24 24 27;
    --popover-foreground: 228 228 231;

    /* Primary (Same Indigo) */
    --primary: 99 102 241;               /* #6366F1 - Indigo 500 (lighter for dark) */
    --primary-foreground: 255 255 255;
    --primary-hover: 129 140 248;        /* #818CF8 - Indigo 400 */
    --primary-active: 79 70 229;
    --primary-muted: 30 27 75;           /* Indigo 950 */

    /* Secondary/Muted */
    --secondary: 39 39 42;               /* #27272A - Zinc 800 */
    --secondary-foreground: 250 250 250;
    --muted: 39 39 42;
    --muted-foreground: 161 161 170;     /* #A1A1AA - Zinc 400 */

    /* Borders */
    --border: 39 39 42;                  /* #27272A - Zinc 800 */
    --input: 39 39 42;
    --ring: 99 102 241;

    /* Accent for dark */
    --accent: 39 39 42;
    --accent-foreground: 129 140 248;
  }

  * {
    @apply border-border;
  }

  html {
    font-size: 14px; /* Dense typography base */
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: "Inter", system-ui, -apple-system, sans-serif;
    font-feature-settings: "rlig" 1, "calt" 1, "cv01" 1, "cv02" 1;
  }

  /* Heading Typography - Tight Tracking */
  h1, h2, h3, h4, h5, h6 {
    @apply font-semibold tracking-tight;
    letter-spacing: -0.01em;
  }

  /* Custom Scrollbar - Minimal */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-zinc-300 dark:bg-zinc-700 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-zinc-400 dark:bg-zinc-600;
  }
}

@layer components {
  /* Focus Ring - Indigo */
  .focus-ring {
    @apply outline-none ring-2 ring-indigo-600/20 ring-offset-2 ring-offset-background;
  }

  /* Fixed Viewport Container */
  .app-container {
    @apply h-screen w-screen overflow-hidden flex;
  }

  /* Sidebar Container */
  .sidebar {
    @apply h-screen w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900;
  }

  .sidebar-collapsed {
    @apply w-16;
  }

  /* Content Area */
  .content-main {
    @apply flex-1 flex flex-col overflow-hidden;
  }

  .content-scroll {
    @apply flex-1 overflow-y-auto p-6;
  }

  /* Card Styles - Crisp 1px lift */
  .card-surface {
    @apply bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  }

  /* Active Navigation Item */
  .nav-item-active {
    @apply bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 relative;
  }

  .nav-item-active::before {
    content: '';
    @apply absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-600 dark:bg-indigo-400 rounded-r;
  }

  /* Data Table Rows - Compact */
  .table-row-compact {
    @apply h-10 border-b border-zinc-100 dark:border-zinc-800;
  }

  /* Bento Grid */
  .bento-grid {
    @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
  }

  /* Skeleton Loader */
  .skeleton {
    @apply bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded;
  }

  /* Dense Typography */
  .text-dense {
    @apply text-sm leading-snug;
  }

  .text-display {
    @apply text-3xl font-bold tracking-tight;
  }

  .text-headline {
    @apply text-xl font-semibold tracking-tight;
  }

  .text-title {
    @apply text-base font-medium;
  }

  .text-label {
    @apply text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400;
  }
}

@layer utilities {
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }

  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

---

### `/apps/web/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sidebar - Light theme (White/Zinc)
        sidebar: {
          DEFAULT: '#FFFFFF',
          foreground: '#18181B',      // Zinc 900
          hover: '#F4F4F5',            // Zinc 100
          accent: '#EEF2FF',           // Indigo 50
          'accent-foreground': '#4F46E5', // Indigo 600
          muted: '#71717A',            // Zinc 500
          border: '#E4E4E7',           // Zinc 200
        },

        // Primary - Indigo (NOT Blue)
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
          DEFAULT: '#4F46E5',
          foreground: '#FFFFFF',
        },

        // Semantic Colors
        success: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
          DEFAULT: '#16A34A',
          foreground: '#FFFFFF',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#D97706',
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
        },
        error: {
          50: '#FEF2F2',
          500: '#EF4444',
          600: '#DC2626',
          DEFAULT: '#E11D48',
          foreground: '#FFFFFF',
        },

        // Neutral - Zinc Scale
        background: '#FAFAFA',
        foreground: '#09090B',
        muted: {
          DEFAULT: '#F4F4F5',
          foreground: '#71717A',
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#18181B',
        },
        border: '#E4E4E7',
        input: '#E4E4E7',
        ring: '#4F46E5',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],     // 13px
        'base': ['0.875rem', { lineHeight: '1.5rem' }],     // 14px (Dense)
        'lg': ['1rem', { lineHeight: '1.5rem' }],           // 16px
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.5rem', { lineHeight: '2rem' }],
        '4xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },

      letterSpacing: {
        tightest: '-0.02em',
        tighter: '-0.01em',
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        'sidebar': '16rem',
        'sidebar-collapsed': '4rem',
        'header': '4rem',
      },

      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },

      boxShadow: {
        'card': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'card-hover': '0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'dropdown': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'sheet': '-4px 0 15px -3px rgb(0 0 0 / 0.1)',
      },

      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },

      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'skeleton': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },

      height: {
        'screen-safe': '100dvh',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 3. Layout Architecture Specification

### Root Layout: Fixed Viewport Pattern

**File:** `/apps/web/src/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SN Connect',
  description: 'Where Policy Meets Productivity',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="h-screen overflow-hidden font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### Component Hierarchy

```
/apps/web/src/
├── app/
│   ├── layout.tsx                    # Root: h-screen overflow-hidden
│   ├── globals.css                   # Titanium & Indigo tokens
│   ├── (auth)/
│   │   ├── layout.tsx               # Auth layout: h-screen flex items-center justify-center bg-zinc-50
│   │   ├── login/page.tsx           # Centered card pattern
│   │   └── forgot-password/page.tsx
│   ├── (employee)/
│   │   ├── layout.tsx               # AppShell: flex h-screen
│   │   ├── dashboard/page.tsx       # Bento grid layout
│   │   └── ...
│   └── (admin)/
│       ├── layout.tsx               # AppShell: flex h-screen
│       └── ...
│
├── components/
│   ├── layouts/
│   │   ├── AppShell.tsx             # Main app container
│   │   ├── ContentArea.tsx          # Scrollable content
│   │   └── PageHeader.tsx           # Page title + actions
│   ├── data-display/
│   │   ├── DataTable/               # TanStack Table wrapper
│   │   │   ├── DataTable.tsx
│   │   │   ├── DataTablePagination.tsx
│   │   │   ├── DataTableColumnHeader.tsx
│   │   │   └── DataTable.types.ts
│   │   ├── BentoGrid.tsx
│   │   └── StatCard.tsx
│   ├── feedback/
│   │   ├── SkeletonCard.tsx
│   │   ├── SkeletonTable.tsx
│   │   └── EmptyState.tsx
│   └── overlays/
│       ├── Sheet.tsx                # Side panel (not modal)
│       └── CommandPalette.tsx       # cmdk integration
│
├── features/
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── QuickActionsCard.tsx
│   │   │   ├── RecentActivityFeed.tsx
│   │   │   ├── SystemStatusCard.tsx
│   │   │   └── OnboardingProgressCard.tsx
│   │   ├── hooks/
│   │   │   └── useDashboardData.ts  # TanStack Query hook
│   │   └── schemas/
│   │       └── dashboard.schema.ts
│   │
│   ├── employees/
│   │   ├── components/
│   │   │   ├── EmployeeTable.tsx
│   │   │   ├── EmployeeSheet.tsx    # Side panel for details
│   │   │   └── EmployeeFilters.tsx
│   │   ├── hooks/
│   │   │   ├── useEmployees.ts
│   │   │   └── useEmployee.ts
│   │   └── schemas/
│   │       └── employee.schema.ts
│   │
│   ├── ai-knowledge/
│   │   ├── components/
│   │   │   ├── SourcesTable.tsx     # TanStack Table
│   │   │   ├── ChatInterface.tsx
│   │   │   └── UploadZone.tsx
│   │   ├── hooks/
│   │   │   ├── useSources.ts
│   │   │   └── useChat.ts
│   │   └── schemas/
│   │       └── ai-knowledge.schema.ts
│   │
│   └── performance/
│       ├── components/
│       ├── hooks/
│       └── schemas/
│
├── lib/
│   ├── query-client.ts              # TanStack Query client config
│   ├── query-keys.ts                # Centralized query key factory
│   └── api/
│       └── client.ts                # Fetch wrapper
│
└── types/
    └── common.types.ts
```

---

## 4. Layout Component Specifications

### AppShell (Main Layout Container)

**Visual Spec:**
```
className="flex h-screen bg-zinc-50 dark:bg-zinc-950"
```

**Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar (w-64)  │  Main Content Area (flex-1)               │
│ ┌─────────────┐ │ ┌───────────────────────────────────────┐ │
│ │ Logo/Brand  │ │ │ Header (h-16, sticky)                 │ │
│ │ SN Connect  │ │ ├───────────────────────────────────────┤ │
│ ├─────────────┤ │ │                                       │ │
│ │ Navigation  │ │ │ Content (flex-1, overflow-y-auto)     │ │
│ │ - Dashboard │ │ │ ┌───────────────────────────────────┐ │ │
│ │ - Tasks     │ │ │ │ Page Header (sticky top-0)       │ │ │
│ │ - Reports   │ │ │ ├───────────────────────────────────┤ │ │
│ │ - ...       │ │ │ │ Page Content (p-6)               │ │ │
│ │             │ │ │ │                                   │ │ │
│ ├─────────────┤ │ │ │                                   │ │ │
│ │ Footer      │ │ │ │                                   │ │ │
│ │ Tagline     │ │ │ └───────────────────────────────────┘ │ │
│ └─────────────┘ │ └───────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar Component Specification

**File:** `/packages/ui/src/layout/Sidebar.tsx`

**Visual Spec:**
```typescript
// Container
className="h-screen w-64 flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800"

// Logo Section (h-16)
className="h-16 flex items-center gap-3 px-4 border-b border-zinc-200 dark:border-zinc-800"

// Logo Icon
className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm"
// Text: "SN"

// Brand Name
className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight"
// Text: "SN Connect"

// Navigation Section
className="flex-1 overflow-y-auto px-3 py-4"

// Nav Item (Inactive)
className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"

// Nav Item (Active)
className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-indigo-600 dark:before:bg-indigo-400 before:rounded-r"

// Footer Section
className="border-t border-zinc-200 dark:border-zinc-800 p-4"

// Tagline
className="text-xs text-zinc-500 dark:text-zinc-400"
// Text: "Where Policy Meets Productivity"
```

### Header Component Specification

**File:** `/packages/ui/src/layout/Header.tsx`

**Visual Spec:**
```typescript
// Container
className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"

// Search Input (if enabled)
className="w-80 h-9 pl-9 pr-4 text-sm bg-zinc-100 dark:bg-zinc-800 border-0 rounded-md placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-600/20"

// Notification Badge
className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-rose-600 text-[10px] font-medium text-white"

// User Menu Trigger
className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"

// User Name
className="text-sm font-medium text-zinc-900 dark:text-zinc-50"

// User Role Badge
className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
```

---

## 5. Login Page Redesign

### Centered Card Pattern (Recommended)

**File:** `/apps/web/src/app/(auth)/login/page.tsx`

**Visual Spec:**
```typescript
// Page Container
className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4"

// Login Card
className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-card"

// Logo Section
className="flex flex-col items-center mb-8"

// Logo Icon
className="h-12 w-12 flex items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg mb-4"
// Text: "SN"

// App Name
className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight"
// Text: "SN Connect"

// Tagline
className="text-sm text-zinc-500 dark:text-zinc-400 mt-1"
// Text: "Where Policy Meets Productivity"

// Form Title
className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 text-center mb-6"
// Text: "Sign in to your account"

// Input Fields
className="h-10 w-full px-4 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"

// Primary Button
className="h-10 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-md transition-colors focus:ring-2 focus:ring-indigo-600/20 focus:ring-offset-2"
// Text: "Sign in"

// Quick Login Buttons (Dev Mode)
className="h-9 px-3 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
```

---

## 6. TanStack Integration Patterns

### Query Client Configuration

**File:** `/apps/web/src/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,           // 1 minute
        gcTime: 10 * 60 * 1000,         // 10 minutes (formerly cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
```

### Query Key Factory

**File:** `/apps/web/src/lib/query-keys.ts`

```typescript
// Centralized query key factory for type-safe cache management

export const queryKeys = {
  // Employees
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters: EmployeeFilters) =>
      [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: TaskFilters) =>
      [...queryKeys.tasks.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
  },

  // Reports
  reports: {
    all: ['reports'] as const,
    weekly: (weekId: string) => [...queryKeys.reports.all, 'weekly', weekId] as const,
    analytics: (params: AnalyticsParams) =>
      [...queryKeys.reports.all, 'analytics', params] as const,
  },

  // AI Knowledge
  aiKnowledge: {
    all: ['ai-knowledge'] as const,
    sources: () => [...queryKeys.aiKnowledge.all, 'sources'] as const,
    source: (id: string) => [...queryKeys.aiKnowledge.sources(), id] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    activity: () => [...queryKeys.dashboard.all, 'activity'] as const,
  },
} as const;
```

### Feature Hook Pattern

**File:** `/apps/web/src/features/employees/hooks/useEmployees.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { employeeSchema, type Employee, type EmployeeFilters } from '../schemas/employee.schema';
import { z } from 'zod';

const employeeListResponseSchema = z.object({
  data: z.array(employeeSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  }),
});

async function fetchEmployees(filters: EmployeeFilters): Promise<z.infer<typeof employeeListResponseSchema>> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.department) params.set('department', filters.department);
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 20));

  const response = await fetch(`/api/employees?${params}`);
  if (!response.ok) throw new Error('Failed to fetch employees');

  const data = await response.json();
  return employeeListResponseSchema.parse(data);
}

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () => fetchEmployees(filters),
    staleTime: 30 * 1000, // 30 seconds for frequently changing data
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/employees/${id}`);
      if (!response.ok) throw new Error('Failed to fetch employee');
      const data = await response.json();
      return employeeSchema.parse(data);
    },
    enabled: !!id,
  });
}
```

### Schema Definition Pattern

**File:** `/apps/web/src/features/employees/schemas/employee.schema.ts`

```typescript
import { z } from 'zod';

// Branded ID type
export const employeeIdSchema = z.string().uuid().brand<'EmployeeId'>();
export type EmployeeId = z.infer<typeof employeeIdSchema>;

// Status enum
export const employeeStatusSchema = z.enum([
  'active',
  'on_leave',
  'probation',
  'terminated',
]);
export type EmployeeStatus = z.infer<typeof employeeStatusSchema>;

// Main schema
export const employeeSchema = z.object({
  id: employeeIdSchema,
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  department: z.string(),
  position: z.string(),
  status: employeeStatusSchema,
  hireDate: z.string().datetime(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Employee = z.infer<typeof employeeSchema>;

// Filter schema
export const employeeFiltersSchema = z.object({
  search: z.string().optional(),
  department: z.string().optional(),
  status: employeeStatusSchema.optional(),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().positive().max(100).optional().default(20),
});

export type EmployeeFilters = z.infer<typeof employeeFiltersSchema>;

// Create/Update schema (for forms)
export const createEmployeeSchema = employeeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateEmployee = z.infer<typeof createEmployeeSchema>;
```

---

## 7. TanStack Table Integration

### Data Table Component

**File:** `/apps/web/src/components/data-display/DataTable/DataTable.tsx`

```typescript
'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  enableRowSelection?: boolean;
  onSelectionChange?: (rows: TData[]) => void;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  onRowClick,
  enableRowSelection = false,
  onSelectionChange,
}: DataTableProps<TData>): React.ReactNode {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection,
  });

  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, table]);

  if (isLoading) {
    return <DataTableSkeleton columns={columns.length} />;
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <table className="w-full">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-10 px-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={cn(
                'h-10 transition-colors',
                onRowClick && 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800',
                row.getIsSelected() && 'bg-indigo-50 dark:bg-indigo-950/30'
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 text-sm text-zinc-900 dark:text-zinc-100">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTableSkeleton({ columns }: { columns: number }): React.ReactNode {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="bg-zinc-50 dark:bg-zinc-900 h-10 border-b border-zinc-200 dark:border-zinc-800" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-10 border-b border-zinc-100 dark:border-zinc-800 last:border-0 flex items-center gap-4 px-4"
        >
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"
              style={{ width: `${Math.random() * 40 + 60}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

---

## 8. Bento Grid Dashboard

### Dashboard Page Specification

**File:** `/apps/web/src/app/(employee)/dashboard/page.tsx`

**Visual Spec:**
```typescript
// Page Container
className="h-full"

// Page Header
className="mb-6"

// Title
className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight"
// Dynamic: "Good morning, {firstName}"

// Subtitle
className="text-sm text-zinc-500 dark:text-zinc-400 mt-1"
// Text: "Here's what's happening with your HR journey today."

// Bento Grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"

// Card (span-2 for larger)
className="col-span-1 lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"

// Quick Actions Card (2x2 icon grid)
// - Upload Documents
// - Submit Report
// - View Calendar
// - Request Leave

// Recent Activity Card (Live feed)
className="col-span-1 lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"

// Stat Card
className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5"

// Stat Label
className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"

// Stat Value
className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1 tabular-nums"

// Stat Trend (positive)
className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1"
// Icon: TrendingUp

// Stat Trend (negative)
className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-1"
// Icon: TrendingDown
```

---

## 9. AI Chat Interface

### Chat Input Specification

**File:** `/packages/ui/src/components/AIChatbot.tsx`

**Focus Ring Pattern:**
```typescript
// Input Container
className="flex items-center gap-2 p-3 border-t border-zinc-200 dark:border-zinc-800"

// Input Field (Inactive)
className="flex-1 h-10 px-4 text-sm bg-zinc-100 dark:bg-zinc-800 border border-transparent rounded-lg placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white dark:focus:bg-zinc-900 transition-all"

// Send Button
className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
```

---

## 10. File-by-File Implementation Checklist

### Phase 1: Design Tokens & Core Styles

| File | Changes | Status |
|------|---------|--------|
| `/apps/web/src/app/globals.css` | Complete rewrite with Titanium & Indigo tokens | ⬜ |
| `/apps/web/tailwind.config.ts` | Update color palette, typography, shadows | ⬜ |
| `/apps/web/src/app/layout.tsx` | Add `h-screen overflow-hidden`, update metadata | ⬜ |

### Phase 2: Branding Updates

| File | Changes | Status |
|------|---------|--------|
| `/packages/ui/src/layout/Sidebar.tsx` | "HR Portal" to "SN Connect", add tagline, new styling | ⬜ |
| `/packages/ui/src/layout/Header.tsx` | Remove branding references, update styling | ⬜ |
| `/apps/web/src/app/(auth)/login/page.tsx` | Complete redesign to centered card | ⬜ |
| `/packages/ui/src/components/AIChatbot.tsx` | "HR Assistant" to "SN Connect AI", update styling | ⬜ |

### Phase 3: Layout Refactoring

| File | Changes | Status |
|------|---------|--------|
| `/apps/web/src/app/(auth)/layout.tsx` | Add fixed viewport pattern | ⬜ |
| `/apps/web/src/app/(employee)/layout.tsx` | Update to new AppShell pattern | ⬜ |
| `/apps/web/src/app/(admin)/layout.tsx` | Update to new AppShell pattern | ⬜ |

### Phase 4: Primitive Component Updates

| File | Changes | Status |
|------|---------|--------|
| `/packages/ui/src/primitives/button.tsx` | Update to Indigo primary, remove blue | ⬜ |
| `/packages/ui/src/primitives/card.tsx` | Update to crisp 1px shadow | ⬜ |
| `/packages/ui/src/primitives/input.tsx` | Add focus ring pattern | ⬜ |
| `/packages/ui/src/primitives/badge.tsx` | Update color variants | ⬜ |

### Phase 5: TanStack Integration

| File | Action | Status |
|------|--------|--------|
| `/apps/web/src/lib/query-client.ts` | Create new file | ⬜ |
| `/apps/web/src/lib/query-keys.ts` | Create new file | ⬜ |
| `/apps/web/src/app/providers.tsx` | Create QueryClientProvider wrapper | ⬜ |
| `/apps/web/package.json` | Add `@tanstack/react-query`, `@tanstack/react-table`, `zod` | ⬜ |

### Phase 6: Feature Refactoring

| Feature | Files to Create/Update | Status |
|---------|----------------------|--------|
| Dashboard | `features/dashboard/` - hooks, schemas, components | ⬜ |
| Employees | `features/employees/` - TanStack Table integration | ⬜ |
| AI Knowledge | `features/ai-knowledge/` - Sources table with TanStack | ⬜ |
| Performance | `features/performance/` - Data grids | ⬜ |

### Phase 7: Page Updates

| Page | Key Changes | Status |
|------|-------------|--------|
| All dashboard pages | Bento grid layout | ⬜ |
| All list pages | TanStack Table with skeleton loaders | ⬜ |
| All form pages | React Hook Form + Zod | ⬜ |
| All detail views | Sheet (side panel) instead of modal | ⬜ |

---

## 11. Quality Verification Checklist

Before marking implementation complete, verify:

- [ ] **No global page scroll** - Body has `h-screen overflow-hidden`
- [ ] **No default Tailwind blue** - All blues replaced with Indigo-600
- [ ] **Branding updated** - "SN Connect" everywhere, tagline in sidebar footer
- [ ] **Sidebar is light** - White/Zinc-50 background, not navy
- [ ] **Dense typography** - 14px base, tight tracking on headings
- [ ] **Focus rings use Indigo** - `ring-indigo-600/20`
- [ ] **Cards have crisp shadow** - `shadow-card` (0 1px 2px)
- [ ] **Tables use TanStack** - Sortable, selectable, skeleton loaders
- [ ] **Modals are Sheets** - Slide from right, not center
- [ ] **All schemas defined** - Zod schemas before components
- [ ] **Query keys centralized** - Using factory pattern
- [ ] **Dark mode tested** - Zinc-950 backgrounds, proper contrast

---

## 12. Dependencies to Add

**File:** `/apps/web/package.json`

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.60.0",
    "@tanstack/react-table": "^8.20.0",
    "@tanstack/react-virtual": "^3.10.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "cmdk": "^1.0.0"
  }
}
```

---

## Appendix: Execution Priority

**Recommended Implementation Order:**

1. **Phase 1** - Design Tokens (globals.css, tailwind.config.ts) - Foundation for everything
2. **Phase 2** - Branding + Login page - High visibility, immediate impact
3. **Phase 3** - Layout refactoring - Fixed viewport pattern
4. **Phase 4** - Primitive components - Building blocks
5. **Phase 5** - TanStack setup - Infrastructure for data
6. **Phase 6-7** - Feature refactoring - Apply patterns to all pages

---

*Generated by SN Connect Architect Agent*
*Last Updated: 2026-02-08*
