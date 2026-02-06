# Frontend Development Plan: Reports & Analytics Dashboard

> **Feature**: Weekly Reports Submission & Analytics Dashboard
> **Reference**: Section 5.4 - Reports & Marketing Submissions
> **Priority**: Phase 3 Feature
> **Target Roles**: Employee (create/submit), Admin & Super Admin (tracking/analytics)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Role-Based Access Matrix](#2-role-based-access-matrix)
3. [Route Structure](#3-route-structure)
4. [Database Schema Reference](#4-database-schema-reference)
5. [Component Architecture](#5-component-architecture)
6. [Page Specifications](#6-page-specifications)
7. [UI Components to Build](#7-ui-components-to-build)
8. [Implementation Tasks](#8-implementation-tasks)
9. [Design Specifications](#9-design-specifications)
10. [Testing Requirements](#10-testing-requirements)

---

## 1. Overview

### Business Requirements

The client requires a dashboard that:
1. **Replaces Google Sheets** for weekly staff report management
2. **Shows weekly reports** of all staff in a centralized view
3. **Compares current week vs previous week** reports side-by-side
4. **Displays graphical comparison** between expenditures vs results

### Feature Scope

| Capability | Employee | Intern | Admin | Super Admin |
|------------|----------|--------|-------|-------------|
| Create reports | ✅ | ❌ | ❌ | ❌ |
| Submit reports | ✅ | ❌ | ❌ | ❌ |
| View own reports | ✅ | ❌ | ✅ | ✅ |
| Track all submissions | ❌ | ❌ | ✅ | ✅ |
| View analytics dashboard | ❌ | ❌ | ✅ | ✅ |
| Week-over-week comparison | ❌ | ❌ | ✅ | ✅ |
| Expenditure vs Results charts | ❌ | ❌ | ✅ | ✅ |

---

## 2. Role-Based Access Matrix

### Employee Role
- **Can Access**: `/reports`, `/reports/new`, `/reports/[id]`
- **Permissions**: Create, submit, view own reports only
- **Restrictions**: Cannot view other employees' reports or analytics

### Intern Role
- **Can Access**: None (redirected to intern dashboard)
- **Permissions**: None for this feature
- **Note**: Interns have their own EOD reports system at `/intern/reports`

### Admin Role
- **Can Access**: `/admin/reports`, `/admin/reports/analytics`, `/admin/reports/compare`
- **Permissions**: View all submissions, access analytics, export data

### Super Admin Role
- **Can Access**: Same as Admin
- **Permissions**: Same as Admin + system configuration

---

## 3. Route Structure

### Employee Routes (under `(employee)` layout)

```
/reports                    # Employee report submission portal
/reports/new                # Create new report form
/reports/[id]               # View/edit specific report
/reports/[id]/edit          # Edit draft report
```

### Admin Routes (under `(admin)` layout)

```
/admin/reports              # All submissions tracking dashboard
/admin/reports/analytics    # Analytics & charts dashboard
/admin/reports/compare      # Week-over-week comparison view
/admin/reports/[id]         # View specific submission details
```

---

## 4. Database Schema Reference

### Tables (from Section 5.4)

#### `report_types`
```sql
CREATE TABLE report_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  deadline_day INTEGER CHECK (deadline_day BETWEEN 1 AND 7),
  deadline_time TIME,
  required_roles TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `report_submissions`
```sql
CREATE TABLE report_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type_id UUID REFERENCES report_types(id),
  submitter_id UUID REFERENCES users(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL,
  file_paths TEXT[],
  status TEXT CHECK (status IN ('draft', 'submitted', 'reviewed')) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `report_metrics` (NEW - for analytics)
```sql
CREATE TABLE report_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES report_submissions(id),
  metric_type TEXT NOT NULL, -- 'expenditure', 'result', 'roi', etc.
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(15,2),
  metric_unit TEXT, -- 'PHP', 'USD', '%', 'count'
  category TEXT, -- 'marketing', 'operations', 'sales'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Component Architecture

### Component Hierarchy

```
packages/ui/src/components/reports/
├── index.ts                        # Exports
├── ReportCard.tsx                  # Individual report display card
├── ReportForm.tsx                  # Report creation/edit form
├── ReportStatusBadge.tsx           # Status indicator (draft/submitted/reviewed)
├── ReportSubmissionList.tsx        # List of submissions with filters
├── ReportSummaryCards.tsx          # Summary statistics cards
├── WeekSelector.tsx                # Week period selector component
├── WeekComparisonTable.tsx         # Side-by-side week comparison
├── analytics/
│   ├── ExpenditureVsResultsChart.tsx    # Main comparison chart
│   ├── WeeklyTrendsChart.tsx            # Trends over time
│   ├── SubmissionRateChart.tsx          # Completion rate donut
│   ├── DepartmentBreakdownChart.tsx     # By department analysis
│   └── MetricComparisonCard.tsx         # Single metric comparison
└── types.ts                        # TypeScript types
```

### Type Definitions

```typescript
// packages/ui/src/components/reports/types.ts

export type ReportId = string & { __brand: 'ReportId' };
export type ReportTypeId = string & { __brand: 'ReportTypeId' };

export type ReportStatus = 'draft' | 'submitted' | 'reviewed';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';

export interface ReportType {
  id: ReportTypeId;
  name: string;
  description: string;
  frequency: ReportFrequency;
  deadlineDay: number; // 1-7 (Monday-Sunday)
  deadlineTime: string; // HH:MM format
  requiredRoles: string[];
}

export interface ReportSubmission {
  id: ReportId;
  reportTypeId: ReportTypeId;
  submitterId: string;
  submitterName: string;
  submitterDepartment: string;
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  content: ReportContent;
  filePaths: string[];
  status: ReportStatus;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportContent {
  summary: string;
  accomplishments: string[];
  challenges: string[];
  nextWeekPlans: string[];
  metrics: ReportMetric[];
  notes?: string;
}

export interface ReportMetric {
  id: string;
  type: 'expenditure' | 'result' | 'roi';
  name: string;
  value: number;
  unit: string;
  category: string;
}

export interface WeekPeriod {
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  label: string; // e.g., "Week 5, 2026"
}

export interface WeekComparison {
  currentWeek: WeekPeriod;
  previousWeek: WeekPeriod;
  metrics: MetricComparison[];
}

export interface MetricComparison {
  name: string;
  category: string;
  currentValue: number;
  previousValue: number;
  change: number;        // Absolute change
  changePercent: number; // Percentage change
  trend: 'up' | 'down' | 'stable';
}

export interface AnalyticsSummary {
  totalSubmissions: number;
  submissionRate: number; // percentage
  totalExpenditure: number;
  totalResults: number;
  averageROI: number;
  byDepartment: DepartmentMetrics[];
}

export interface DepartmentMetrics {
  department: string;
  submissions: number;
  expenditure: number;
  results: number;
  roi: number;
}
```

---

## 6. Page Specifications

### 6.1 Employee: Reports Portal (`/reports`)

**Purpose**: Employee's personal report management hub

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  My Weekly Reports                          [+ New Report]  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ Total       │ │ Submitted   │ │ Pending     │            │
│  │ Reports: 12 │ │ This Month:4│ │ Draft: 1    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All Status ▼] [All Periods ▼]      🔍 Search      │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Week 5, 2026 (Jan 27 - Feb 2)          [Submitted ✓]  │  │
│  │ Marketing Spend Report                                 │  │
│  │ Submitted: Feb 2, 2026 3:45 PM                        │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Week 6, 2026 (Feb 3 - Feb 9)           [Draft ○]      │  │
│  │ Marketing Spend Report                                 │  │
│  │ Last edited: Feb 5, 2026 10:30 AM      [Edit] [Submit]│  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Summary cards showing report statistics
- List of all personal reports with status badges
- Filter by status (draft, submitted, reviewed)
- Filter by period (current month, last 3 months, custom)
- Quick actions: Edit draft, View submitted
- "New Report" button navigates to `/reports/new`

---

### 6.2 Employee: New Report (`/reports/new`)

**Purpose**: Create and submit weekly report

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Reports                                          │
│                                                             │
│  Create Weekly Report                                       │
│  Week 6, 2026 (Feb 3 - Feb 9)                              │
├─────────────────────────────────────────────────────────────┤
│  Report Type: [Marketing Spend Report ▼]                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Summary *                                           │    │
│  │ ┌─────────────────────────────────────────────────┐ │    │
│  │ │ Brief overview of the week...                   │ │    │
│  │ └─────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Expenditures                              [+ Add]   │    │
│  │ ┌───────────────────────────────────────────────┐   │    │
│  │ │ Facebook Ads    │ Marketing │ ₱ 15,000    [×] │   │    │
│  │ │ Google Ads      │ Marketing │ ₱ 12,500    [×] │   │    │
│  │ │ Influencer Fee  │ Marketing │ ₱ 8,000     [×] │   │    │
│  │ └───────────────────────────────────────────────┘   │    │
│  │ Total Expenditure: ₱ 35,500                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Results / Outcomes                        [+ Add]   │    │
│  │ ┌───────────────────────────────────────────────┐   │    │
│  │ │ Leads Generated │ Sales     │ 245         [×] │   │    │
│  │ │ Revenue         │ Sales     │ ₱ 85,000    [×] │   │    │
│  │ │ New Followers   │ Marketing │ 1,200       [×] │   │    │
│  │ └───────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Attachments                               [Upload]  │    │
│  │ 📎 facebook_receipt.pdf                             │    │
│  │ 📎 campaign_screenshot.png                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│           [Save as Draft]              [Submit Report]      │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Auto-detect current week period
- Dynamic form based on report type
- Add/remove expenditure line items
- Add/remove result metrics
- File upload for receipts/screenshots
- Save as draft functionality
- Submit with confirmation dialog
- Validation before submission

---

### 6.3 Admin: Submissions Tracking (`/admin/reports`)

**Purpose**: Track all staff report submissions

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Weekly Reports Tracking                                    │
│  [Analytics Dashboard →]  [Week Comparison →]               │
├─────────────────────────────────────────────────────────────┤
│  Week: [Week 6, 2026 ▼]                                     │
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ Total Staff │ │ Submitted   │ │ Pending     │ │ Rate   │ │
│  │     24      │ │     18      │ │      6      │ │  75%   │ │
│  │             │ │   ✓ ✓ ✓     │ │   ○ ○ ○     │ │ ████░░ │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All Depts ▼] [All Status ▼]        🔍 Search      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Employee      │ Dept      │ Status    │ Submitted  │ ▼ ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ John Doe      │ Marketing │ Submitted │ Feb 2, 3PM │ 👁 ││
│  │ Jane Smith    │ Marketing │ Submitted │ Feb 2, 2PM │ 👁 ││
│  │ Bob Wilson    │ Sales     │ Pending   │ -          │ 📧 ││
│  │ Alice Brown   │ Sales     │ Draft     │ -          │ 📧 ││
│  │ ...           │ ...       │ ...       │ ...        │    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [◀ Prev Week]  Showing 1-20 of 24        [Next Week ▶]     │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Week selector dropdown
- Summary cards with submission statistics
- Sortable, filterable data table
- Filter by department, status
- Quick view action for submitted reports
- Send reminder action for pending submissions
- Export to CSV/Excel
- Pagination

---

### 6.4 Admin: Analytics Dashboard (`/admin/reports/analytics`)

**Purpose**: Visualize expenditure vs results with charts

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Reports Analytics                                          │
│  ← Back to Tracking                                         │
├─────────────────────────────────────────────────────────────┤
│  Period: [Last 4 Weeks ▼]    Department: [All ▼]            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ │
│  │ Total Spend │ │ Total Result│ │ Avg ROI     │ │ Reports│ │
│  │ ₱ 142,000   │ │ ₱ 340,000   │ │   239%      │ │   96   │ │
│  │ ↑ 12%       │ │ ↑ 18%       │ │ ↑ 6%        │ │ 100%   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         EXPENDITURE vs RESULTS (Weekly Trend)         │  │
│  │                                                       │  │
│  │  ₱400k ┤                                    ▄▄        │  │
│  │        │                              ▄▄   ████       │  │
│  │  ₱300k ┤                        ▄▄   ████  ████       │  │
│  │        │                  ▄▄   ████  ████  ████       │  │
│  │  ₱200k ┤            ▄▄   ████  ████  ████  ████       │  │
│  │        │      ██   ████  ████  ████  ████  ████       │  │
│  │  ₱100k ┤     ████  ████  ████  ████  ████  ████       │  │
│  │        │     ████  ████  ████  ████  ████  ████       │  │
│  │      0 ┼─────────────────────────────────────────     │  │
│  │          Wk1   Wk2   Wk3   Wk4   Wk5   Wk6            │  │
│  │                                                       │  │
│  │        ██ Expenditure    ██ Results                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐    │
│  │  Spend by Category      │ │  ROI by Department      │    │
│  │       ┌────┐            │ │                         │    │
│  │      /      \           │ │  Marketing  ████████ 280%│   │
│  │     │ 45%    │          │ │  Sales      ██████   210%│   │
│  │     │Marketing│         │ │  Operations ████     180%│   │
│  │      \  30%  /          │ │  HR         ███      150%│   │
│  │       └────┘            │ │                         │    │
│  │     25% Operations      │ │                         │    │
│  └─────────────────────────┘ └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Period selector (last week, last 4 weeks, last quarter, custom)
- Department filter
- Summary metric cards with trend indicators
- **Expenditure vs Results bar chart** (grouped by week)
- Spend breakdown pie/donut chart by category
- ROI by department horizontal bar chart
- Interactive tooltips on hover
- Export charts as PNG/PDF

---

### 6.5 Admin: Week Comparison (`/admin/reports/compare`)

**Purpose**: Side-by-side comparison of current vs previous week

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Week-over-Week Comparison                                  │
│  ← Back to Tracking                                         │
├─────────────────────────────────────────────────────────────┤
│  Compare: [Week 5, 2026 ▼]  vs  [Week 6, 2026 ▼]           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┬─────────────────────────┐      │
│  │      WEEK 5             │       WEEK 6            │      │
│  │   Jan 27 - Feb 2        │    Feb 3 - Feb 9        │      │
│  ├─────────────────────────┼─────────────────────────┤      │
│  │                         │                         │      │
│  │  Total Expenditure      │  Total Expenditure      │      │
│  │  ₱ 125,000              │  ₱ 142,000              │      │
│  │                         │         ↑ 13.6%         │      │
│  ├─────────────────────────┼─────────────────────────┤      │
│  │  Total Results          │  Total Results          │      │
│  │  ₱ 288,000              │  ₱ 340,000              │      │
│  │                         │         ↑ 18.1%         │      │
│  ├─────────────────────────┼─────────────────────────┤      │
│  │  ROI                    │  ROI                    │      │
│  │  230%                   │  239%                   │      │
│  │                         │         ↑ 9pp           │      │
│  ├─────────────────────────┼─────────────────────────┤      │
│  │  Submissions            │  Submissions            │      │
│  │  22/24 (92%)            │  18/24 (75%)            │      │
│  │                         │         ↓ 17pp          │      │
│  └─────────────────────────┴─────────────────────────┘      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              METRIC BREAKDOWN COMPARISON              │  │
│  ├──────────────────┬──────────┬──────────┬─────────────┤  │
│  │ Metric           │ Week 5   │ Week 6   │ Change      │  │
│  ├──────────────────┼──────────┼──────────┼─────────────┤  │
│  │ Facebook Ads     │ ₱45,000  │ ₱52,000  │ ↑ 15.6%     │  │
│  │ Google Ads       │ ₱38,000  │ ₱42,000  │ ↑ 10.5%     │  │
│  │ Leads Generated  │ 180      │ 245      │ ↑ 36.1%     │  │
│  │ Revenue          │ ₱288,000 │ ₱340,000 │ ↑ 18.1%     │  │
│  │ New Followers    │ 850      │ 1,200    │ ↑ 41.2%     │  │
│  └──────────────────┴──────────┴──────────┴─────────────┘  │
│                                                             │
│                    [Export Comparison]                      │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Dual week selector
- Side-by-side metric cards with change indicators
- Detailed breakdown table with all metrics
- Color coding: green for improvement, red for decline
- Percentage and absolute change display
- Export comparison as PDF/Excel

---

## 7. UI Components to Build

### Priority 1: Core Components

| Component | Location | Description |
|-----------|----------|-------------|
| `ReportCard` | `reports/ReportCard.tsx` | Displays report summary with status badge |
| `ReportStatusBadge` | `reports/ReportStatusBadge.tsx` | Status indicator (draft/submitted/reviewed) |
| `ReportForm` | `reports/ReportForm.tsx` | Full report creation/edit form |
| `MetricInput` | `reports/MetricInput.tsx` | Reusable expenditure/result input row |
| `WeekSelector` | `reports/WeekSelector.tsx` | Week period dropdown selector |
| `ReportSummaryCards` | `reports/ReportSummaryCards.tsx` | Summary statistics cards |

### Priority 2: Admin Components

| Component | Location | Description |
|-----------|----------|-------------|
| `ReportSubmissionList` | `reports/ReportSubmissionList.tsx` | DataTable for submissions |
| `SubmissionRateCard` | `reports/SubmissionRateCard.tsx` | Progress indicator card |
| `WeekComparisonTable` | `reports/WeekComparisonTable.tsx` | Side-by-side comparison |
| `MetricComparisonCard` | `reports/analytics/MetricComparisonCard.tsx` | Single metric comparison |

### Priority 3: Chart Components

| Component | Location | Description |
|-----------|----------|-------------|
| `ExpenditureVsResultsChart` | `reports/analytics/ExpenditureVsResultsChart.tsx` | Grouped bar chart |
| `SpendByCategoryChart` | `reports/analytics/SpendByCategoryChart.tsx` | Donut chart |
| `ROIByDepartmentChart` | `reports/analytics/ROIByDepartmentChart.tsx` | Horizontal bar chart |
| `WeeklyTrendsChart` | `reports/analytics/WeeklyTrendsChart.tsx` | Line chart over time |

### Charting Library Recommendation

Use **Recharts** for React-based charts:
- Built for React with declarative API
- Responsive and accessible
- Supports all required chart types
- Lightweight bundle size

```bash
pnpm add recharts
```

---

## 8. Implementation Tasks

### Phase 1: Database & Types (Backend Prep)

- [ ] **Task 1.1**: Create `report_types` table migration
- [ ] **Task 1.2**: Create `report_submissions` table migration
- [ ] **Task 1.3**: Create `report_metrics` table migration
- [ ] **Task 1.4**: Create RLS policies for reports (employee sees own, admin sees all)
- [ ] **Task 1.5**: Create TypeScript types in `packages/ui/src/components/reports/types.ts`

### Phase 2: Employee Report Submission

- [ ] **Task 2.1**: Create `ReportStatusBadge` component
- [ ] **Task 2.2**: Create `ReportCard` component
- [ ] **Task 2.3**: Create `WeekSelector` component
- [ ] **Task 2.4**: Create `MetricInput` component (expenditure/result row)
- [ ] **Task 2.5**: Create `ReportForm` component with validation
- [ ] **Task 2.6**: Create `ReportSummaryCards` component
- [ ] **Task 2.7**: Create `/reports` page (employee portal)
- [ ] **Task 2.8**: Create `/reports/new` page (create report)
- [ ] **Task 2.9**: Create `/reports/[id]` page (view report)
- [ ] **Task 2.10**: Add "Reports" to employee sidebar navigation
- [ ] **Task 2.11**: Implement save draft functionality
- [ ] **Task 2.12**: Implement submit with confirmation dialog

### Phase 3: Admin Submission Tracking

- [ ] **Task 3.1**: Create `ReportSubmissionList` component with DataTable
- [ ] **Task 3.2**: Create `SubmissionRateCard` component
- [ ] **Task 3.3**: Create `/admin/reports` page (tracking dashboard)
- [ ] **Task 3.4**: Implement filter by department, status
- [ ] **Task 3.5**: Implement search by employee name
- [ ] **Task 3.6**: Implement send reminder action
- [ ] **Task 3.7**: Implement CSV export
- [ ] **Task 3.8**: Add "Reports" to admin/super-admin sidebar navigation

### Phase 4: Analytics Dashboard

- [ ] **Task 4.1**: Install and configure Recharts
- [ ] **Task 4.2**: Create `ExpenditureVsResultsChart` component
- [ ] **Task 4.3**: Create `SpendByCategoryChart` component
- [ ] **Task 4.4**: Create `ROIByDepartmentChart` component
- [ ] **Task 4.5**: Create `WeeklyTrendsChart` component
- [ ] **Task 4.6**: Create `MetricComparisonCard` component
- [ ] **Task 4.7**: Create `/admin/reports/analytics` page
- [ ] **Task 4.8**: Implement period selector (last week, 4 weeks, quarter)
- [ ] **Task 4.9**: Implement chart export functionality

### Phase 5: Week Comparison Feature

- [ ] **Task 5.1**: Create `WeekComparisonTable` component
- [ ] **Task 5.2**: Create `/admin/reports/compare` page
- [ ] **Task 5.3**: Implement dual week selector
- [ ] **Task 5.4**: Calculate and display change percentages
- [ ] **Task 5.5**: Implement color coding for trends
- [ ] **Task 5.6**: Implement export comparison as PDF

### Phase 6: n8n Workflows

- [ ] **Task 6.1**: Create Weekly Report Reminder workflow (Friday 2 PM)
- [ ] **Task 6.2**: Create Deadline Reminder workflow (Monday 9 AM)
- [ ] **Task 6.3**: Create Overdue Escalation workflow (Monday 12 PM)
- [ ] **Task 6.4**: Create Submission Handler workflow (notify reviewers)

---

## 9. Design Specifications

### Color Palette for Charts

```css
/* Expenditure - Red/Orange tones */
--chart-expenditure: #f97316; /* orange-500 */
--chart-expenditure-light: #fed7aa; /* orange-200 */

/* Results - Green tones */
--chart-results: #22c55e; /* green-500 */
--chart-results-light: #bbf7d0; /* green-200 */

/* Category colors */
--chart-marketing: #3b82f6; /* blue-500 */
--chart-sales: #8b5cf6; /* violet-500 */
--chart-operations: #f59e0b; /* amber-500 */
--chart-hr: #ec4899; /* pink-500 */
```

### Status Badge Colors

| Status | Background | Text | Border |
|--------|------------|------|--------|
| Draft | `bg-slate-100` | `text-slate-700` | `border-slate-300` |
| Submitted | `bg-blue-100` | `text-blue-700` | `border-blue-300` |
| Reviewed | `bg-green-100` | `text-green-700` | `border-green-300` |

### Trend Indicators

| Trend | Icon | Color |
|-------|------|-------|
| Up (positive) | `↑` or `TrendingUp` | `text-green-600` |
| Down (negative) | `↓` or `TrendingDown` | `text-red-600` |
| Stable | `→` or `Minus` | `text-slate-500` |

### Responsive Breakpoints

| Breakpoint | Layout Changes |
|------------|----------------|
| Mobile (`<640px`) | Single column, stacked cards, simplified charts |
| Tablet (`640-1024px`) | 2-column grid, full charts |
| Desktop (`>1024px`) | 4-column summary cards, side-by-side comparison |

---

## 10. Testing Requirements

### Unit Tests

- [ ] `ReportStatusBadge` renders correct colors for each status
- [ ] `WeekSelector` calculates correct week periods
- [ ] `MetricInput` validates numeric input
- [ ] `ReportForm` validation rules work correctly
- [ ] Chart components render without errors

### Integration Tests

- [ ] Employee can create and save draft report
- [ ] Employee can submit report successfully
- [ ] Admin can view all submissions
- [ ] Filters work correctly on submission list
- [ ] Week comparison calculates changes correctly

### E2E Tests

- [ ] Full report submission flow (create → save draft → submit)
- [ ] Admin views analytics dashboard
- [ ] Admin compares two weeks
- [ ] Export functionality works

### Accessibility Tests

- [ ] All charts have appropriate ARIA labels
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader can interpret chart data

---

## Appendix: File Structure Summary

```
apps/web/src/app/
├── (employee)/
│   └── reports/
│       ├── page.tsx              # /reports - Employee portal
│       ├── new/
│       │   └── page.tsx          # /reports/new - Create report
│       └── [id]/
│           └── page.tsx          # /reports/[id] - View report
└── (admin)/
    └── admin/
        └── reports/
            ├── page.tsx          # /admin/reports - Tracking
            ├── analytics/
            │   └── page.tsx      # /admin/reports/analytics
            └── compare/
                └── page.tsx      # /admin/reports/compare

packages/ui/src/components/reports/
├── index.ts
├── types.ts
├── ReportCard.tsx
├── ReportForm.tsx
├── ReportStatusBadge.tsx
├── ReportSubmissionList.tsx
├── ReportSummaryCards.tsx
├── WeekSelector.tsx
├── WeekComparisonTable.tsx
├── MetricInput.tsx
├── SubmissionRateCard.tsx
└── analytics/
    ├── ExpenditureVsResultsChart.tsx
    ├── SpendByCategoryChart.tsx
    ├── ROIByDepartmentChart.tsx
    ├── WeeklyTrendsChart.tsx
    └── MetricComparisonCard.tsx
```

---

## Notes for Frontend Developer

1. **Start with Phase 2** (Employee submission) as it's the core functionality
2. Use existing UI primitives from `@hr-portal/ui` (Card, Button, Input, etc.)
3. Follow the Container/Presenter pattern as per CLAUDE.md
4. All components must be TypeScript strict mode compliant
5. Charts should be responsive and work on mobile
6. Remember: Interns do NOT have access to this feature - add role guard

---

*Document created: February 6, 2026*
*Last updated: February 6, 2026*
*Author: UI/UX Design Review*
