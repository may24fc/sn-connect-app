# Performance Reviews

The Performance page (`/performance`) lets you track your objectives, key performance indicators, and complete self-assessments during review cycles.

## Performance Dashboard

When you open the performance page you'll see:

### Current Cycle Banner

Shows the active review cycle name, date range, and an **Active Cycle** badge. If a self-assessment deadline is approaching, a warning is displayed.

### Progress Summary

Two gauges show your overall standing:

| Gauge | Description |
|-------|-------------|
| **OKR Progress** | Average completion across all your objectives |
| **KPI Score** | Average score across all your KPIs |

Plus a **Review Status** badge showing where you are in the review process.

### Upcoming Deadlines

- **Self-Assessment deadline** — When you need to complete your review
- **Manager Review deadline** — When your manager will review you
- Days remaining badge for each

### Quick Action Cards

Three cards link to sub-pages:

| Card | Links To | Description |
|------|----------|-------------|
| **OKRs** | `/performance/okrs` | Your objectives and key results with progress bars |
| **KPIs** | `/performance/kpis` | Your key performance indicators with scores |
| **Self-Assessment** | `/performance/review` | Start or resume your self-review |

## OKRs (Objectives & Key Results)

Navigate to `/performance/okrs` to manage your objectives.

Each objective shows:
- **Objective title** and description
- **Key Results** — Measurable targets with individual progress bars
- **Overall progress** — Aggregate percentage across all key results
- **Status** — Not Started, In Progress, At Risk, Completed

### OKR Detail Page (`/performance/okrs/[id]`)

Click an objective to view its full detail:

- **Progress Circle** — SVG circular progress indicator with percentage
- **Status Badge** and review cycle info
- **Mark Complete** button when all targets are met

#### Targets & KPIs

Each target card shows:

| Metric Type | Display |
|-------------|---------||
| **Number** | Current / Target with progress bar |
| **Boolean** | Completed / Not completed toggle |
| **Currency** | PHP amount with target |
| **Tasks** | Task count completed vs total |

Targets include weight percentage and admin rating (if evaluated).

#### Managing Targets

1. Click **"Add Target"** to create a new key result
2. Fill in: Title, Metric Type, Target Value, Current Value, Weight
3. Click **Save**

Use the **"Update Progress"** button on any target to log progress:
- **Number/Currency** — Numeric slider
- **Boolean** — Toggle switch

Progress updates are reflected in real-time via Supabase Realtime subscriptions.

## KPIs (Key Performance Indicators)

Navigate to `/performance/kpis` to view your KPIs.

Each KPI displays:
- **KPI name** and description
- **Target** — The goal you're working toward
- **Actual** — Your current measurement
- **Score** — Percentage of target achieved
- **Trend** — Up/down/steady arrow

## Self-Assessment

Navigate to `/performance/review` during an active cycle to complete your self-assessment.

1. Review your OKR progress and KPI scores
2. Rate yourself on each objective and KPI
3. Provide a written self-reflection
4. Submit your review

After submission, your manager will complete their review, followed by HR's final review.

### Review Flow

```
Self-Assessment → Manager Review → HR Review → Complete
     (you)         (your manager)     (HR)
```

## Performance Ratings

| Rating | Description |
|--------|-------------|
| **Exceptional** | Consistently exceeds expectations |
| **Exceeds Expectations** | Frequently surpasses goals |
| **Meets Expectations** | Achieves all required objectives |
| **Needs Improvement** | Falls short on some objectives |
| **Unsatisfactory** | Does not meet minimum requirements |

---

*Last updated: 2026-03-08*

Next: [Information Hub](information-hub.md) · Previous: [Invoices](invoices.md)
