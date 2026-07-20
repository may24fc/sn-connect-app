import chromium from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';
import type { MonthlyExpenseReport } from './monthly-report';

const PIE_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#14B8A6', '#F43F5E', '#94A3B8'];

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatMoney(value: number): string {
  return `AUD ${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMoneyShort(value: number): string {
  return value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  if (value === null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatCategoryLabel(category: string): string {
  return category.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function buildPieGradient(values: number[]): string {
  const total = values.reduce((sum, n) => sum + n, 0);
  if (total <= 0) return '#E2E8F0';

  let start = 0;
  const parts: string[] = [];
  values.forEach((value, idx) => {
    const pct = (value / total) * 100;
    const end = start + pct;
    const color = PIE_COLORS[idx % PIE_COLORS.length] ?? '#94A3B8';
    parts.push(`${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    start = end;
  });

  return `conic-gradient(${parts.join(', ')})`;
}

function buildPieCardHtml(title: string, slices: Array<{ label: string; value: number }>): string {
  const filtered = slices.filter((s) => s.value > 0);
  const values = filtered.map((s) => s.value);
  const total = values.reduce((sum, n) => sum + n, 0);
  const gradient = buildPieGradient(values);

  const legend = filtered.map((slice, idx) => {
    const color = PIE_COLORS[idx % PIE_COLORS.length] ?? '#94A3B8';
    const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0';
    return `
      <li class="legend-item">
        <span class="legend-dot" style="background:${color};"></span>
        <span class="legend-label">${escapeHtml(slice.label)}</span>
        <span class="legend-pct">${pct}%</span>
      </li>
    `;
  }).join('');

  return `
    <div class="pie-card">
      <h4>${escapeHtml(title)}</h4>
      <div class="pie-wrap">
        <div class="pie" style="background:${gradient};"></div>
        <ul class="legend">${legend}</ul>
      </div>
    </div>
  `;
}

function buildInsights(report: MonthlyExpenseReport): string[] {
  const bullets: string[] = [];

  const totalItem = report.summary.find((s) => s.metric.toLowerCase().includes('total spend'));
  if (totalItem && totalItem.momPercentChange !== null) {
    const direction = totalItem.momPercentChange > 0 ? 'increased' : 'decreased';
    bullets.push(
      `Total spend ${direction} by ${Math.abs(totalItem.momPercentChange).toFixed(1)}% MoM (${formatMoney(totalItem.previousMonth)} -> ${formatMoney(totalItem.currentMonth)}).`,
    );
  }

  const largestIncrease = [...report.departmentBreakdown]
    .filter((d) => (d.momVariationPercent ?? 0) > 0)
    .sort((a, b) => (b.momVariationPercent ?? 0) - (a.momVariationPercent ?? 0))[0];
  if (largestIncrease) {
    bullets.push(
      `${largestIncrease.departmentName} had the largest uplift at +${largestIncrease.momVariationPercent!.toFixed(1)}% MoM (${formatMoney(largestIncrease.spendAud)}).`,
    );
  }

  const largestDrop = [...report.departmentBreakdown]
    .filter((d) => (d.momVariationPercent ?? 0) < 0)
    .sort((a, b) => (a.momVariationPercent ?? 0) - (b.momVariationPercent ?? 0))[0];
  if (largestDrop) {
    bullets.push(
      `${largestDrop.departmentName} reduced spend by ${Math.abs(largestDrop.momVariationPercent!).toFixed(1)}% MoM (${formatMoney(largestDrop.spendAud)}), indicating improved cost discipline.`,
    );
  }

  const topCategory = report.categoryBreakdown[0];
  if (topCategory) {
    bullets.push(
      `${formatCategoryLabel(topCategory.category)} was the largest expense category, representing ${topCategory.percentOfTotal.toFixed(1)}% of total spend (${formatMoney(topCategory.spendAud)}).`,
    );
  }

  if (report.anomalies.length > 0) {
    const varianceCount = report.anomalies.filter((a) => a.reason === 'variance_flagged').length;
    const spikeCount = report.anomalies.filter((a) => a.reason === 'price_spike').length;
    const parts: string[] = [];
    if (varianceCount) parts.push(`${varianceCount} variance discrepanc${varianceCount === 1 ? 'y' : 'ies'}`);
    if (spikeCount) parts.push(`${spikeCount} price spike${spikeCount === 1 ? '' : 's'}`);
    bullets.push(
      `${report.anomalies.length} flagged entr${report.anomalies.length === 1 ? 'y' : 'ies'} detected (${parts.join(' and ')}) - see Anomaly Detail section below.`,
    );
  } else {
    bullets.push('No anomalies flagged this period; all entries are within acceptable variance thresholds.');
  }

  return bullets;
}

function buildMonthlyExpenseReportHtml(report: MonthlyExpenseReport): string {
  const generatedStr = new Date(report.generatedAt).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' });

  const scopeStr = `${report.currentRangeStart} to ${report.currentRangeEndInclusive} | Prior: ${report.previousRangeStart} to ${report.previousRangeEndInclusive}`;

  const allDeptNames = Array.from(new Set([
    ...report.departmentBreakdown.map((r) => r.departmentName),
    ...report.previousDepartmentBreakdown.map((r) => r.departmentName),
  ]));

  const prevDeptMap = new Map(report.previousDepartmentBreakdown.map((r) => [r.departmentName, r.spendAud]));
  const curDeptMap = new Map(report.departmentBreakdown.map((r) => [r.departmentName, { spendAud: r.spendAud, mom: r.momVariationPercent }]));
  allDeptNames.sort((a, b) => (curDeptMap.get(b)?.spendAud ?? 0) - (curDeptMap.get(a)?.spendAud ?? 0));

  const allCategories = Array.from(new Set([
    ...report.categoryBreakdown.map((r) => r.category),
    ...report.previousCategoryBreakdown.map((r) => r.category),
  ]));
  const prevCatMap = new Map(report.previousCategoryBreakdown.map((r) => [r.category, r]));
  const curCatMap = new Map(report.categoryBreakdown.map((r) => [r.category, r]));
  allCategories.sort((a, b) => (curCatMap.get(b)?.percentOfTotal ?? 0) - (curCatMap.get(a)?.percentOfTotal ?? 0));

  const summaryRows = report.summary.map((item) => {
    const isSpend = item.metric.includes('Spend');
    const prevValue = isSpend ? formatMoneyShort(item.previousMonth) : String(item.previousMonth);
    const curValue = isSpend ? formatMoneyShort(item.currentMonth) : String(item.currentMonth);
    const mom = formatPercent(item.momPercentChange);
    const momClass = mom.startsWith('+') ? 'mom-negative' : mom.startsWith('-') && mom !== '--' ? 'mom-positive' : 'mom-neutral';

    return `
      <div class="metric-row">
        <div class="metric-card prev">
          <div class="metric-label">${escapeHtml(item.metric.toUpperCase())}</div>
          <div class="metric-value">${isSpend ? '<span class="currency">AUD</span>' : ''}${escapeHtml(prevValue)}</div>
        </div>
        <div class="metric-card current">
          <div class="metric-label">${escapeHtml(item.metric.toUpperCase())}</div>
          <div class="metric-value">${isSpend ? '<span class="currency">AUD</span>' : ''}${escapeHtml(curValue)}</div>
          <div class="mom-chip ${momClass}">${escapeHtml(mom)}</div>
        </div>
      </div>
    `;
  }).join('');

  const prevDeptPie = buildPieCardHtml(
    'Top Operational Units',
    allDeptNames.map((name) => ({ label: name, value: prevDeptMap.get(name) ?? 0 })),
  );
  const curDeptPie = buildPieCardHtml(
    'Top Operational Units',
    allDeptNames.map((name) => ({ label: name, value: curDeptMap.get(name)?.spendAud ?? 0 })),
  );

  const prevCatPie = buildPieCardHtml(
    'By Expense Category',
    allCategories.map((cat) => ({ label: formatCategoryLabel(cat), value: prevCatMap.get(cat)?.spendAud ?? 0 })),
  );
  const curCatPie = buildPieCardHtml(
    'By Expense Category',
    allCategories.map((cat) => ({ label: formatCategoryLabel(cat), value: curCatMap.get(cat)?.spendAud ?? 0 })),
  );

  const prevDeptRows = allDeptNames.map((name) => `
    <tr>
      <td>${escapeHtml(name)}</td>
      <td class="right">${escapeHtml(formatMoney(prevDeptMap.get(name) ?? 0))}</td>
    </tr>
  `).join('');

  const curDeptRows = allDeptNames.map((name) => {
    const entry = curDeptMap.get(name);
    const mom = entry ? formatPercent(entry.mom) : '--';
    const momClass = mom.startsWith('+') ? 'mom-negative' : mom.startsWith('-') && mom !== '--' ? 'mom-positive' : 'mom-neutral';
    return `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td class="right">${escapeHtml(entry ? formatMoney(entry.spendAud) : '--')}</td>
        <td class="right ${momClass}">${escapeHtml(mom)}</td>
      </tr>
    `;
  }).join('');

  const prevCatRows = allCategories.map((cat) => {
    const entry = prevCatMap.get(cat);
    return `
      <tr>
        <td>${escapeHtml(formatCategoryLabel(cat))}</td>
        <td class="right">${escapeHtml(entry ? formatMoney(entry.spendAud) : '--')}</td>
        <td class="right">${escapeHtml(entry ? `${entry.percentOfTotal.toFixed(1)}%` : '--')}</td>
      </tr>
    `;
  }).join('');

  const curCatRows = allCategories.map((cat) => {
    const entry = curCatMap.get(cat);
    return `
      <tr>
        <td>${escapeHtml(formatCategoryLabel(cat))}</td>
        <td class="right">${escapeHtml(entry ? formatMoney(entry.spendAud) : '--')}</td>
        <td class="right">${escapeHtml(entry ? `${entry.percentOfTotal.toFixed(1)}%` : '--')}</td>
      </tr>
    `;
  }).join('');

  const insightsHtml = buildInsights(report)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');

  const anomaliesSection = report.anomalies.length > 0
    ? `
      <section class="section avoid-break">
        <h2 class="section-title">Anomaly Detail - Flagged Entries Only</h2>
        <table class="data-table anomaly-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Date</th>
              <th class="right">Amount (AUD)</th>
              <th class="right">Variance (AUD)</th>
              <th class="center">Flag Type</th>
            </tr>
          </thead>
          <tbody>
            ${report.anomalies.map((row) => {
              const flag = row.reason === 'variance_flagged' ? 'Variance Flagged' : 'Price Spike';
              const badgeClass = row.reason === 'variance_flagged' ? 'flag-variance' : 'flag-spike';
              return `
                <tr>
                  <td class="vendor">${escapeHtml(row.vendorName)}</td>
                  <td>${escapeHtml(row.transactionDate)}</td>
                  <td class="right">${escapeHtml(formatMoney(row.totalAmountAud))}</td>
                  <td class="right">${escapeHtml(row.varianceAmountAud !== null ? formatMoney(row.varianceAmountAud) : '--')}</td>
                  <td class="center"><span class="flag-badge ${badgeClass}">${escapeHtml(flag)}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </section>
    `
    : '';

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      :root {
        --navy: #1E293B;
        --slate: #334155;
        --muted: #64748B;
        --faint: #94A3B8;
        --divider: #F1F5F9;
        --border: #E2E8F0;
        --accent: #3B82F6;
        --bg-card: #F8FAFC;
        --rose: #F43F5E;
        --emerald: #10B981;
      }

      @page {
        size: A4;
        margin: 48px;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Helvetica, Arial, sans-serif;
        color: var(--slate);
        font-size: 11px;
      }

      .header-line {
        height: 2px;
        background: var(--navy);
        margin-bottom: 10px;
      }

      .title {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--navy);
      }

      .title .accent {
        color: var(--accent);
      }

      .meta {
        margin-top: 4px;
        display: flex;
        justify-content: space-between;
        color: var(--muted);
        font-size: 8px;
      }

      .divider {
        border-top: 1px solid var(--border);
        margin: 10px 0 16px;
      }

      .section {
        margin-bottom: 14px;
      }

      .section-title {
        margin: 0 0 10px;
        color: var(--navy);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        padding-left: 10px;
        border-left: 3px solid var(--accent);
      }

      .month-headers {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 8px;
      }

      .month-label {
        text-align: center;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.6px;
      }

      .month-label.prev { color: var(--muted); }
      .month-label.cur { color: var(--navy); }

      .metrics {
        display: grid;
        gap: 8px;
      }

      .metric-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .metric-card {
        border: 1px solid var(--border);
        border-radius: 6px;
        min-height: 62px;
        padding: 10px 12px;
        position: relative;
      }

      .metric-card.prev { background: #FAFBFC; }
      .metric-card.current { background: var(--bg-card); }

      .metric-label {
        color: var(--muted);
        font-size: 7px;
        letter-spacing: 0.4px;
        text-transform: uppercase;
      }

      .metric-value {
        margin-top: 7px;
        text-align: right;
        font-weight: 700;
        font-size: 16px;
        color: var(--navy);
      }

      .metric-value .currency {
        font-size: 8px;
        color: var(--muted);
        margin-right: 4px;
        vertical-align: middle;
      }

      .mom-chip {
        position: absolute;
        left: 10px;
        bottom: 8px;
        height: 16px;
        min-width: 60px;
        border-radius: 8px;
        padding: 0 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 8px;
      }

      .mom-positive { color: var(--emerald); background: #ECFDF5; }
      .mom-negative { color: var(--rose); background: #FFF1F2; }
      .mom-neutral { color: var(--muted); background: var(--divider); }

      .distribution {
        break-inside: avoid;
      }

      .columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      .column {
        min-width: 0;
      }

      .column.right {
        border-left: 1px solid var(--border);
        padding-left: 10px;
      }

      .pie-card {
        margin-bottom: 10px;
      }

      .pie-card h4 {
        margin: 0 0 8px;
        font-size: 9px;
        color: var(--navy);
      }

      .pie-wrap {
        display: grid;
        grid-template-columns: 130px 1fr;
        gap: 10px;
        align-items: center;
      }

      .pie {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        border: 1px solid var(--border);
      }

      .legend {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .legend-item {
        display: grid;
        grid-template-columns: 8px 1fr auto;
        gap: 6px;
        align-items: center;
        margin-bottom: 3px;
        font-size: 7px;
      }

      .legend-dot {
        width: 7px;
        height: 7px;
        border-radius: 1px;
      }

      .legend-label { color: var(--slate); }
      .legend-pct { color: var(--muted); }

      .table-title {
        margin: 6px 0 6px;
        font-size: 9px;
        color: var(--navy);
      }

      table.data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 8px;
      }

      .data-table th {
        text-transform: uppercase;
        letter-spacing: 0.4px;
        color: var(--muted);
        font-size: 7.5px;
        text-align: left;
        border-bottom: 1px solid var(--border);
        padding: 5px 0;
      }

      .data-table td {
        border-bottom: 1px solid var(--divider);
        padding: 6px 0;
        font-size: 8.5px;
      }

      .data-table td.right,
      .data-table th.right { text-align: right; }

      .data-table td.center,
      .data-table th.center { text-align: center; }

      .data-table td.vendor {
        color: var(--navy);
        font-weight: 700;
      }

      .insights {
        border: 1px solid #BFDBFE;
        border-left: 3px solid var(--accent);
        border-radius: 6px;
        background: #EFF6FF;
        padding: 12px 14px;
        break-inside: avoid;
      }

      .insights h3 {
        margin: 0 0 8px;
        color: var(--navy);
        font-size: 8.5px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      .insights ul {
        margin: 0;
        padding: 0 0 0 16px;
      }

      .insights li {
        margin: 0 0 6px;
        color: var(--slate);
        font-size: 8px;
      }

      .flag-badge {
        display: inline-block;
        min-width: 70px;
        border-radius: 8px;
        padding: 2px 8px;
        font-size: 7.5px;
        font-weight: 700;
      }

      .flag-variance {
        background: #FFF7ED;
        color: #B45309;
      }

      .flag-spike {
        background: #FFF1F2;
        color: #BE123C;
      }

      .avoid-break {
        break-inside: avoid;
      }

      .footer {
        position: fixed;
        bottom: 8px;
        left: 48px;
        right: 48px;
        text-align: center;
        color: var(--faint);
        font-size: 7.5px;
      }
    </style>
  </head>
  <body>
    <div class="header-line"></div>
    <h1 class="title">Monthly Expense Analytics Report <span class="accent">- ${escapeHtml(report.reportMonthLabel)}</span></h1>
    <div class="meta">
      <span>Generated ${escapeHtml(generatedStr)}</span>
      <span>${escapeHtml(scopeStr)}</span>
    </div>
    <div class="divider"></div>

    <section class="section avoid-break">
      <h2 class="section-title">Summary Key Metrics</h2>
      <div class="month-headers">
        <div class="month-label prev">PREVIOUS MONTH</div>
        <div class="month-label cur">CURRENT MONTH</div>
      </div>
      <div class="metrics">${summaryRows}</div>
    </section>

    <section class="section distribution">
      <h2 class="section-title">Spend Distribution</h2>
      <div class="month-headers">
        <div class="month-label prev">PREVIOUS MONTH</div>
        <div class="month-label cur">CURRENT MONTH</div>
      </div>

      <div class="columns avoid-break">
        <div class="column">
          ${prevDeptPie}
          <h4 class="table-title">Top Operational Units</h4>
          <table class="data-table">
            <thead><tr><th>Department</th><th class="right">Spend</th></tr></thead>
            <tbody>${prevDeptRows}</tbody>
          </table>
        </div>
        <div class="column right">
          ${curDeptPie}
          <h4 class="table-title">Top Operational Units</h4>
          <table class="data-table">
            <thead><tr><th>Department</th><th class="right">Spend</th><th class="right">MoM</th></tr></thead>
            <tbody>${curDeptRows}</tbody>
          </table>
        </div>
      </div>

      <div class="columns avoid-break">
        <div class="column">
          ${prevCatPie}
          <h4 class="table-title">By Expense Category</h4>
          <table class="data-table">
            <thead><tr><th>Category</th><th class="right">Amount</th><th class="right">%</th></tr></thead>
            <tbody>${prevCatRows}</tbody>
          </table>
        </div>
        <div class="column right">
          ${curCatPie}
          <h4 class="table-title">By Expense Category</h4>
          <table class="data-table">
            <thead><tr><th>Category</th><th class="right">Amount</th><th class="right">%</th></tr></thead>
            <tbody>${curCatRows}</tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="insights">
        <h3>Key Spending Insights</h3>
        <ul>${insightsHtml}</ul>
      </div>
    </section>

    ${anomaliesSection}

    <div class="footer">Control Hub | Confidential</div>
  </body>
</html>
  `;
}

export async function renderMonthlyExpenseReportPdf(report: MonthlyExpenseReport): Promise<Buffer> {
  const html = buildMonthlyExpenseReportHtml(report);
  let browser;
  try {
    const executablePath =
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
      (await chromium.executablePath());

    browser = await playwrightChromium.launch({
      executablePath,
      headless: true,
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to launch Chromium for HTML-to-PDF rendering. Ensure @sparticuz/chromium is available in this runtime or provide PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. Original error: ${msg}`,
    );
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '48px',
        right: '48px',
        bottom: '48px',
        left: '48px',
      },
    });

    await page.close();
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
