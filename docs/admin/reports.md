# Reports Analytics

This guide covers tracking staff report submissions and viewing analytics.

## Reports Dashboard (`/admin/reports`)

### Header Actions

- **"Analytics"** button — Navigate to `/admin/reports/analytics` for charts
- **"Compare"** button — Navigate to `/admin/reports/compare` for week-over-week comparison

### Week Period Selector

A dropdown at the top lets you select which week to review. Shows the last 12 weeks.

### KPI Cards

| Card | Description |
|------|-------------|
| **Total Staff** | Number of employees expected to submit |
| **Submitted** | How many have submitted (with trend arrow) |
| **Pending** | How many haven't submitted (color-coded by severity) |
| **Completion Rate** | Percentage of staff who submitted on time |

### Insights Summary

Automated analysis including:

- **Best Performers** — Staff with consistent submission streaks
- **Needs Attention** — Staff who frequently miss deadlines
- **Overall Trend** — Whether submissions are improving or declining
- Recommendations for action

### Submission Rate Card

Visual progress indicator showing submitted vs. pending breakdown for the selected week.

### Submission Status List

A per-employee list showing:

- Employee name and avatar
- Submission status (✅ submitted or ⏳ pending)
- **"Send Reminder"** action for pending submissions
- **"View"** action for submitted reports
- **Export** button to download the data

## Reports Analytics (`/admin/reports/analytics`)

Comprehensive charts for expenditure and results analysis.

### Filters

- **Period selector** — Last Week, Last 4 Weeks, Last Quarter, or Custom date range
- **Department filter** — Narrow to specific departments

### KPI Cards

| Card | Description |
|------|-------------|
| **Total Spend** | Aggregate expenditure (PHP) |
| **Total Results** | Aggregate results/revenue (PHP) |
| **Average ROI** | Return on investment percentage |
| **Total Reports** | Number of reports in the selected period |

### Charts

1. **Expenditure vs Results** — Time-series line chart comparing spend and results
2. **Spend by Category** — Pie/donut chart breaking down where money went
3. **ROI by Department** — Bar chart comparing department efficiency
4. **Weekly Trends** — Line chart showing submission patterns

### Export

Click **"Export"** to download the analytics report for offline analysis or presentations.

## Reports Comparison (`/admin/reports/compare`)

Side-by-side week comparison view:

- Select two weeks to compare
- See submission rates, expenditure, and results for each
- Identify trends and changes

---

Next: [Announcements](announcements.md) · Previous: [Probation Tracking](probation.md)
