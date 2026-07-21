# Internship Components Reference

> Audience: Developers

Internship tracking UI — associate cards, hours progress, daily report forms, and summary dashboards.

**Location:** `packages/ui/src/components/internship/`  
**Import:** `import { InternCard, HoursProgressCard, EODReportForm, ... } from '@hr-portal/ui';`  
**Types:** `packages/ui/src/types/internship.types.ts`

---

## Type Definitions

Key types from `internship.types.ts`:

```typescript
type InternshipStatus = 'active' | 'completed' | 'terminated' | 'converted';
type ReportStatus = 'pending' | 'approved' | 'revision_needed';

interface InternshipPeriod {
  id: InternshipPeriodId;
  startDate: string;
  endDate: string;
  requiredHours: number;
  completedHours: number;
  status: InternshipStatus;
}

interface DailyReport {
  id: DailyReportId;
  logDate: string;
  hoursWorked: number;
  tasksCompleted: string;
  challenges: string;
  learnings: string;
  isApproved: boolean;
  supervisorNotes?: string;
}
```

### Utility Functions

| Function | Description |
|----------|-------------|
| `calculateHoursProgress(completed, required)` | Progress percentage |
| `getDaysRemaining(endDate)` | Days until end |
| `isOnTrack(completed, required, elapsed, total)` | On-track boolean |

### Status Config

`INTERNSHIP_STATUS_CONFIG` and `REPORT_STATUS_CONFIG` map statuses to colors and labels.

---

## InternStatusBadge / InternReportStatusBadge / HoursProgressBadge

Status badges for internship lifecycle, daily report approval, and hours completion.

```tsx
<InternshipStatusBadge status="active" />
<InternReportStatusBadge status="approved" />
<HoursProgressBadge completed={240} required={500} />
```

---

## InternCard / InternList / InternRow

Associate profile card showing name, department, hours progress, status, and supervisor.

- `InternCard` — Grid card layout
- `InternList` — Vertical list of cards
- `InternRow` — Table row layout

---

## HoursProgressCard / HoursProgressMini

Visual progress display for completed vs required hours.

- `HoursProgressCard` — Full card with hours breakdown and percentage
- `HoursProgressMini` — Compact inline progress bar

---

## InternHoursProgressBar

Styled progress bar for associate hours with color thresholds.

```typescript
interface InternHoursProgressBarProps {
  completed: number;
  required: number;
  showLabel?: boolean;
}
```

---

## DailyReportCard / DailyReportList / DailyReportSummary

Display components for daily log entries.

- `DailyReportCard` — Single log with date, hours, tasks, approval status
- `DailyReportList` — Scrollable list of daily reports
- `DailyReportSummary` — Aggregate stats (total logs, total hours, approval rate)

---

## EODReportForm

End-of-day report submission form. Fields: date, hours worked, progress and impact, current blockers, and next steps.

```tsx
<EODReportForm
  internshipId={internship.id}
  onSubmit={handleSubmit}
  isLoading={isPending}
/>
```

---

## InternshipSummaryCards / InternPersonalStats

Dashboard summary cards.

- `InternshipSummaryCards` — Admin view: active associates, total hours, completion rate
- `InternPersonalStats` — Associate's personal view: hours, days remaining, progress

---

*Last updated: 2026-02-27*
