# Performance Components Reference

> Audience: Developers

Performance management UI — OKR cards, KPI gauges, review status badges, charts, and summary dashboards.

**Location:** `packages/ui/src/components/performance/`  
**Import:** `import { OKRCard, KPICard, PerformanceCharts, ... } from '@hr-portal/ui';`  
**Types:** `packages/ui/src/types/performance.types.ts`

---

## Type Definitions

Key types from `performance.types.ts`:

```typescript
type CycleStatus = 'active' | 'completed' | 'upcoming';
type OKRStatus = 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'completed';
type ReviewStatus = 'pending' | 'self_review' | 'manager_review' | 'completed';
type PerformanceRating = 1 | 2 | 3 | 4 | 5;

interface KeyResult {
  id: KeyResultId;
  description: string;
  targetValue: number;
  currentValue: number;
  progressPercentage: number;
}

interface OKR {
  id: OKRId;
  objective: string;
  keyResults: KeyResult[];
  progress: number;
  status: OKRStatus;
}

interface KPI {
  id: KPIId;
  name: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}
```

### Status Configs

Pre-defined color/label configs:

| Config | Maps |
|--------|------|
| `REVIEW_STATUS_CONFIG` | ReviewStatus → color, label, icon |
| `OKR_STATUS_CONFIG` | OKRStatus → color, label |
| `RATING_CONFIG` | 1-5 → label, color |

---

## Status Badges

### ReviewStatusBadge

Badge for performance review status.

### OKRStatusBadge

Badge for OKR progress status (not_started → completed).

### ProgressStatusBadge

Generic progress badge showing color based on percentage thresholds.

---

## OKRCard / OKRList

Card displaying a single OKR with objective text, overall progress bar, and key results list with individual progress.

```tsx
<OKRCard okr={okr} onEdit={handleEdit} />
<OKRList okrs={okrs} onOKRClick={handleClick} />
```

---

## KPICard / KPIList / KPISummary

Metric card showing KPI name, current vs target values, unit, and progress gauge.

- `KPICard` — Single KPI display
- `KPIList` — Array of KPIs
- `KPISummary` — Aggregate metrics (avg achievement, at-risk count)

---

## PerformanceCharts

Recharts-based visualizations for performance data.

| Component | Chart Type | Description |
|-----------|-----------|-------------|
| `CompletionTrendChart` | Line | Review completion rate over time |
| `DepartmentPerformanceChart` | Bar | Average ratings by department |
| `RatingDistributionChart` | Pie/Bar | Distribution of 1-5 ratings |
| `ProgressGauge` | Radial | Single metric gauge (0-100%) |

---

## PerformanceSummaryCards / CycleProgressCards

Dashboard summary cards for performance modules.

- `PerformanceSummaryCards` — Aggregate stats: active cycles, pending reviews, avg rating
- `CycleProgressCards` — Per-cycle progress: completion %, deadline status

---

*Last updated: 2026-02-27*
