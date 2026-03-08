# Report Components Reference

> Audience: Developers

Weekly report system UI — form, submission list, analytics, and comparison tools.

**Location:** `packages/ui/src/components/reports/`  
**Import:** `import { ReportForm, ReportCard, WeekSelector, MetricInput, ... } from '@hr-portal/ui';`

---

## Types

Key types exported from `reports/types.ts`:

```typescript
type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
type ReportFrequency = 'weekly' | 'monthly';
type MetricType = 'currency' | 'number' | 'percentage';

interface WeekPeriod {
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
}

interface ReportMetric {
  id: MetricId;
  name: string;
  type: MetricType;
  value: number;
  target?: number;
}
```

### Utility Functions

| Function | Description |
|----------|-------------|
| `getCurrentWeekPeriod()` | Current week's start/end dates |
| `getWeekNumber(date)` | ISO week number |
| `formatPeriodLabel(period)` | "Week 4, 2026" format |
| `calculateTotalExpenditure(metrics)` | Sum currency metrics |
| `calculateTotalResults(metrics)` | Sum result metrics |
| `calculateROI(expenditure, results)` | ROI calculation |

---

## Core Components

### ReportStatusBadge

Badge with color mapped to report status.

| Status | Color |
|--------|-------|
| `draft` | Secondary |
| `submitted` | Indigo |
| `approved` | Success |
| `rejected` | Destructive |

### WeekSelector / WeekDropdownSelector

Date-based week picker. `WeekSelector` shows week navigation arrows; `WeekDropdownSelector` provides a dropdown.

### MetricInput / MetricInputGroup

Controlled numeric input for report metrics. `MetricInputGroup` renders multiple metrics in a grid.

### ReportCard / ReportList

Card display for a single report with status, period, and metrics summary. `ReportList` renders an array.

### ReportSummaryCards

Dashboard stats: total reports, submission rate, approved count, pending reviews.

### ReportForm

Full report creation/edit form. Includes metric inputs, period selector, and submit controls.

---

## Admin Components

### ReportSubmissionList

Admin table showing all submitted reports with employee name, period, status, and action buttons.

### SubmissionRateCard

Visualization of team submission compliance rates.

### WeekComparisonTable

Week-over-week metric comparison table with delta indicators.

---

## Analytics Charts (Recharts)

All charts use Recharts and follow the Titanium & Indigo color palette.

| Chart | Description |
|-------|-------------|
| `ExpenditureVsResultsChart` | Dual-axis bar chart comparing spend to results |
| `SpendByCategoryChart` | Pie/donut chart of spending by category |
| `ROIByDepartmentChart` | Horizontal bar chart of ROI by department |
| `WeeklyTrendsChart` | Line chart of weekly metric trends |

### Usage

```tsx
<WeeklyTrendsChart data={weeklyData} metrics={['expenditure', 'results']} />
```

---

## Dashboard Components

### MetricKPICard / MetricKPICardGrid

KPI cards for report metrics with value, target, and progress indicator.

```typescript
interface MetricKPICardProps {
  title: string;
  value: number;
  target?: number;
  unit?: string;
  trend?: { value: number; direction: 'up' | 'down' };
}
```

### InsightsSummary / InsightsSummaryList

AI-generated or computed insights from report data.

```typescript
interface InsightsSummaryProps {
  findings: KeyFinding[];
}

interface KeyFinding {
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}
```

---

*Last updated: 2026-02-27*
