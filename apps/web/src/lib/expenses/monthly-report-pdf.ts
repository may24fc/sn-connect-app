import PDFDocument from 'pdfkit';
import type { MonthlyExpenseReport } from './monthly-report';

// ---------------------------------------------------------------------------
// Design tokens - corporate executive palette
// ---------------------------------------------------------------------------
const M = 48; // page margin
const CONTENT_WIDTH = 595.28 - M * 2; // A4 width minus margins

const C = {
  navy: '#1E293B',
  slate: '#334155',
  muted: '#64748B',
  faint: '#94A3B8',
  divider: '#F1F5F9',
  border: '#E2E8F0',
  cardBg: '#F8FAFC',
  white: '#FFFFFF',
  accent: '#3B82F6',
  emerald: '#10B981',
  amber: '#F59E0B',
  rose: '#F43F5E',
  pillDraft: '#F1F5F9',
  pillDraftText: '#64748B',
  pillBlue: '#EFF6FF',
  pillBlueText: '#1D4ED8',
  pillGreen: '#ECFDF5',
  pillGreenText: '#065F46',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fill(doc: PDFKit.PDFDocument, color: string): PDFKit.PDFDocument {
  return doc.fillColor(color);
}

function stroke(doc: PDFKit.PDFDocument, color: string): PDFKit.PDFDocument {
  return doc.strokeColor(color);
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number): void {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function formatMoney(value: number): string {
  return `AUD ${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMoneyShort(value: number): string {
  // Large primary figure inside KPI card
  return value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  // Edge case: previous month was 0 -> neutral dash instead of "New"
  if (value === null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function momColor(value: number | null): string {
  if (value === null) return C.muted;
  if (value > 0) return C.rose;
  if (value < 0) return C.emerald;
  return C.muted;
}

function formatCategoryLabel(category: string): string {
  return category.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

// ---------------------------------------------------------------------------
// Section heading with navy accent bar
// ---------------------------------------------------------------------------
function sectionHeading(doc: PDFKit.PDFDocument, title: string, y?: number): void {
  // ensureSpace MUST run before capturing headY so that if a page break
  // occurs the accent bar and title are positioned at the top of the new
  // page rather than at the old near-bottom y (which would make the new
  // page appear blank and push doc.y past the page boundary).
  if (y === undefined) ensureSpace(doc, 32);
  const headY = y ?? doc.y;

  // left accent bar
  doc.rect(M, headY, 3, 16).fill(C.accent);

  fill(doc, C.navy).font('Helvetica-Bold').fontSize(12)
    .text(title.toUpperCase(), M + 10, headY + 2, { characterSpacing: 0.8 });

  doc.y = headY + 24;
}

// ---------------------------------------------------------------------------
// KPI grid - two columns: Previous Month (left) vs Current Month (right)
// ---------------------------------------------------------------------------
function drawKpiGrid(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  const GAP = 16;
  const INNER_GAP = 8;
  const colW = (CONTENT_WIDTH - GAP) / 2;
  const cardH = 62;
  const totalGridHeight = report.summary.length * cardH + (report.summary.length - 1) * INNER_GAP;

  ensureSpace(doc, totalGridHeight + 60);

  const leftX = M;
  const rightX = M + colW + GAP;
  const colLabelY = doc.y;

  fill(doc, C.muted).font('Helvetica-Bold').fontSize(10)
    .text('PREVIOUS MONTH', leftX, colLabelY, { width: colW, align: 'center', characterSpacing: 0.6 });
  fill(doc, C.navy).font('Helvetica-Bold').fontSize(10)
    .text('CURRENT MONTH', rightX, colLabelY, { width: colW, align: 'center', characterSpacing: 0.6 });

  const gridStartY = colLabelY + 18;
  const divX = M + colW + GAP / 2;

  stroke(doc, C.border).lineWidth(1)
    .moveTo(divX, gridStartY - 4)
    .lineTo(divX, gridStartY + totalGridHeight + 4)
    .stroke();

  report.summary.forEach((item, rowIdx) => {
    const isSpend = item.metric.includes('Spend');
    const cardY = gridStartY + rowIdx * (cardH + INNER_GAP);

    const renderCard = (cardX: number, value: number, isCurrent: boolean) => {
      const cardBg = isCurrent ? C.cardBg : '#FAFBFC';
      const borderColor = isCurrent ? C.border : '#EEF2F7';
      doc.roundedRect(cardX, cardY, colW, cardH, 6)
        .fillColor(cardBg).fill()
        .roundedRect(cardX, cardY, colW, cardH, 6)
        .strokeColor(borderColor).lineWidth(1).stroke();

      // Metric label — top-left
      fill(doc, C.muted).font('Helvetica').fontSize(7)
        .text(item.metric.toUpperCase(), cardX + 12, cardY + 10, {
          width: colW - 24,
          characterSpacing: 0.4,
        });

      // Value — top-right aligned inside card
      const valueText = isSpend ? formatMoneyShort(value) : String(value);
      const valuePad = 14;

      if (isSpend) {
        fill(doc, C.muted).font('Helvetica').fontSize(8)
          .text('AUD', cardX + valuePad, cardY + 18, { width: colW - valuePad * 2, align: 'right', continued: false });
        fill(doc, isCurrent ? C.navy : C.slate).font('Helvetica-Bold').fontSize(16)
          .text(valueText, cardX + valuePad, cardY + 26, { width: colW - valuePad * 2, align: 'right' });
      } else {
        fill(doc, isCurrent ? C.navy : C.slate).font('Helvetica-Bold').fontSize(16)
          .text(valueText, cardX + valuePad, cardY + 26, { width: colW - valuePad * 2, align: 'right' });
      }

      // Bottom-left delta indicator — only on current month card
      if (isCurrent) {
        const momVal = item.momPercentChange;
        const deltaLabel = formatPercent(momVal);

        // Determine direction: positive = green filled, negative = red filled, neutral = grey
        const momC = momColor(momVal);
        const isPositive = momC === C.emerald;
        const isNegative = momC === C.rose;
        const indicatorBg = isPositive ? '#ECFDF5' : isNegative ? '#FFF1F2' : C.divider;
        const indicatorText = momC;

        const indH = 16;
        const indW = 60;
        const indX = cardX + 10;
        const indY = cardY + cardH - indH - 8;

        doc.roundedRect(indX, indY, indW, indH, 8)
          .fillColor(indicatorBg).fill();

        fill(doc, indicatorText).font('Helvetica-Bold').fontSize(8)
          .text(deltaLabel, indX, indY + 3, { width: indW, align: 'center' });
      }
    };

    renderCard(leftX, item.previousMonth, false);
    renderCard(rightX, item.currentMonth, true);
  });

  doc.y = gridStartY + totalGridHeight + 20;
}

// ---------------------------------------------------------------------------
// Borderless list table - category or department column pair
// ---------------------------------------------------------------------------
interface ListColumnOptions {
  title: string;
  headers: string[];
  rows: string[][];
  widths: number[];
  rightAlignColumns?: number[];
  /** Column indices whose values are MoM percent strings (e.g. "+12.5%", "--") and should be tinted accordingly. */
  momColumns?: number[];
  startX: number;
  startY: number;
  availableWidth: number;
}

function drawListColumn(doc: PDFKit.PDFDocument, opts: ListColumnOptions): number {
  const { headers, rows, widths, rightAlignColumns = [], momColumns = [], startX, availableWidth } = opts;
  const ROW_H = 20;
  const HEADER_H = 22;
  let curY = opts.startY;

  fill(doc, C.muted).font('Helvetica-Bold').fontSize(7.5);
  let cx = startX;
  headers.forEach((h, i) => {
    const w = widths[i] ?? 0;
    const align = rightAlignColumns.includes(i) ? 'right' : 'left';
    doc.text(h.toUpperCase(), cx, curY + 5, { width: w - 4, align, characterSpacing: 0.4 });
    cx += w;
  });

  curY += HEADER_H;

  stroke(doc, C.border).lineWidth(0.5)
    .moveTo(startX, curY - 2)
    .lineTo(startX + availableWidth, curY - 2)
    .stroke();

  fill(doc, C.slate).font('Helvetica').fontSize(8.5);

  rows.forEach((row) => {
    // Sync PDFKit's cursor to our tracked position before the page-break
    // check. Without this, ensureSpace sees stale doc.y (left by previous
    // text calls) and either mis-fires or misses the break, causing curY to
    // drift off-page and create a cascade of empty pages.
    doc.y = curY;
    ensureSpace(doc, ROW_H);
    curY = doc.y; // capture top-of-new-page reset if a break just occurred
    cx = startX;
    row.forEach((cell, ci) => {
      const w = widths[ci] ?? 0;
      const align = rightAlignColumns.includes(ci) ? 'right' : 'left';
      const isMoney = align === 'right' && cell.startsWith('AUD');

      if (isMoney) {
        fill(doc, C.navy).font('Helvetica-Bold').fontSize(8.5)
          .text(cell, cx, curY + 4, { width: w - 4, align: 'right' });
      } else if (ci === 0) {
        fill(doc, C.slate).font('Helvetica').fontSize(8.5)
          .text(cell, cx, curY + 4, { width: w - 4 });
      } else if (momColumns.includes(ci)) {
        // Derive sign from formatted string: "+" → positive spend increase → rose
        // "-" → spend decrease → emerald; "--" or "0" → neutral muted.
        const isMomPositive = cell.startsWith('+');
        const isMomNegative = cell.startsWith('-') && cell !== '--';
        const momTextColor = isMomPositive ? C.rose : isMomNegative ? C.emerald : C.muted;
        fill(doc, momTextColor).font('Helvetica-Bold').fontSize(8.5)
          .text(cell, cx, curY + 4, { width: w - 4, align });
      } else {
        fill(doc, C.muted).font('Helvetica').fontSize(8.5)
          .text(cell, cx, curY + 4, { width: w - 4, align });
      }
      cx += w;
    });

    curY += ROW_H;
    stroke(doc, C.divider).lineWidth(0.5)
      .moveTo(startX, curY)
      .lineTo(startX + availableWidth, curY)
      .stroke();
  });

  return curY + 8;
}

// ---------------------------------------------------------------------------
// Pie chart - compact circle + side legend, drawn at explicit coordinates
// ---------------------------------------------------------------------------
const PIE_PALETTE = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#14B8A6', '#F43F5E', '#94A3B8'];

function drawPieChart(
  doc: PDFKit.PDFDocument,
  slices: { label: string; value: number }[],
  startX: number,
  startY: number,
  availableWidth: number,
): number {
  const nonZero = slices.filter((s) => s.value > 0);
  if (nonZero.length === 0) return startY;

  // Isolate doc.y side-effects: legend doc.text() calls would move the shared
  // cursor and cause ensureSpace in subsequent drawListColumn calls to mis-fire.
  const savedDocY = doc.y;

  const RADIUS = 42;
  const cx = startX + RADIUS + 6;
  const cy = startY + RADIUS + 6;
  const total = nonZero.reduce((sum, s) => sum + s.value, 0);

  // Draw slices using SVG arc paths (reliable in PDFKit across all versions).
  // sweep-flag=1 in A command = clockwise in screen coords (y-axis down).
  let angle = -Math.PI / 2; // start from 12 o'clock
  nonZero.forEach((slice, i) => {
    const sweep = (slice.value / total) * 2 * Math.PI;
    const endAngle = angle + sweep;
    const color = PIE_PALETTE[i % PIE_PALETTE.length]!;

    if (sweep >= 2 * Math.PI - 0.001) {
      // Full circle — single draw avoids degenerate arc
      doc.circle(cx, cy, RADIUS).fillColor(color).fill();
    } else {
      const x1 = cx + RADIUS * Math.cos(angle);
      const y1 = cy + RADIUS * Math.sin(angle);
      const x2 = cx + RADIUS * Math.cos(endAngle);
      const y2 = cy + RADIUS * Math.sin(endAngle);
      const largeArc = sweep > Math.PI ? 1 : 0;
      doc
        .path(`M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`)
        .fillColor(color)
        .fill();
    }
    angle = endAngle;
  });

  // Subtle ring outline for polish
  stroke(doc, C.border).lineWidth(0.5).circle(cx, cy, RADIUS).stroke();

  // Legend to the right of the circle
  const legendX = startX + RADIUS * 2 + 16;
  const legendW = availableWidth - RADIUS * 2 - 20;
  const labelW = Math.round(legendW * 0.68);
  const pctW = legendW - labelW - 4;
  const pctX = legendX + 11 + labelW + 4;
  const ITEM_H = 13;
  const SWATCH = 7;
  let legendY = startY + 6;

  nonZero.forEach((slice, i) => {
    const color = PIE_PALETTE[i % PIE_PALETTE.length]!;
    const pct = ((slice.value / total) * 100).toFixed(1) + '%';

    doc.roundedRect(legendX, legendY + 2, SWATCH, SWATCH, 1).fillColor(color).fill();
    fill(doc, C.slate).font('Helvetica').fontSize(7)
      .text(slice.label, legendX + SWATCH + 4, legendY, { width: labelW, lineBreak: false });
    fill(doc, C.muted).font('Helvetica').fontSize(7)
      .text(pct, pctX, legendY, { width: pctW, align: 'right', lineBreak: false });
    legendY += ITEM_H;
  });

  const endY = Math.max(cy + RADIUS + 12, legendY + 4);
  doc.y = savedDocY; // restore before returning
  return endY;
}

// ---------------------------------------------------------------------------
// Key insights card - derives natural-language bullets from report data
// ---------------------------------------------------------------------------
function generateInsights(report: MonthlyExpenseReport): string[] {
  const bullets: string[] = [];

  // 1. Overall MoM spend direction
  const totalItem = report.summary.find((s) => s.metric.toLowerCase().includes('total spend'));
  if (totalItem && totalItem.momPercentChange !== null) {
    const mom = totalItem.momPercentChange;
    const dir = mom > 0 ? 'increased' : 'decreased';
    bullets.push(
      `Total spend ${dir} by ${Math.abs(mom).toFixed(1)}% MoM ` +
      `(${formatMoney(totalItem.previousMonth)} \u2192 ${formatMoney(totalItem.currentMonth)}).`,
    );
  }

  // 2. Department with largest spend increase
  const topUp = [...report.departmentBreakdown]
    .filter((d) => (d.momVariationPercent ?? 0) > 0)
    .sort((a, b) => (b.momVariationPercent ?? 0) - (a.momVariationPercent ?? 0))[0];
  if (topUp) {
    bullets.push(
      `${topUp.departmentName} had the largest uplift at +${topUp.momVariationPercent!.toFixed(1)}% MoM ` +
      `(${formatMoney(topUp.spendAud)}).`,
    );
  }

  // 3. Department with largest spend reduction
  const topDown = [...report.departmentBreakdown]
    .filter((d) => (d.momVariationPercent ?? 0) < 0)
    .sort((a, b) => (a.momVariationPercent ?? 0) - (b.momVariationPercent ?? 0))[0];
  if (topDown) {
    bullets.push(
      `${topDown.departmentName} reduced spend by ${Math.abs(topDown.momVariationPercent!).toFixed(1)}% MoM ` +
      `(${formatMoney(topDown.spendAud)}), indicating improved cost discipline.`,
    );
  }

  // 4. Leading expense category by share
  const topCat = report.categoryBreakdown[0];
  if (topCat) {
    bullets.push(
      `${formatCategoryLabel(topCat.category)} was the largest expense category, ` +
      `representing ${topCat.percentOfTotal.toFixed(1)}% of total spend (${formatMoney(topCat.spendAud)}).`,
    );
  }

  // 5. Anomaly summary
  if (report.anomalies.length > 0) {
    const vCount = report.anomalies.filter((a) => a.reason === 'variance_flagged').length;
    const sCount = report.anomalies.filter((a) => a.reason === 'price_spike').length;
    const parts: string[] = [];
    if (vCount) parts.push(`${vCount} variance discrepanc${vCount === 1 ? 'y' : 'ies'}`);
    if (sCount) parts.push(`${sCount} price spike${sCount === 1 ? '' : 's'}`);
    bullets.push(
      `${report.anomalies.length} flagged entr${report.anomalies.length === 1 ? 'y' : 'ies'} detected ` +
      `(${parts.join(' and ')}) — see Anomaly Detail section below.`,
    );
  } else {
    bullets.push('No anomalies flagged this period; all entries are within acceptable variance thresholds.');
  }

  return bullets;
}

function drawInsightsCard(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  const bullets = generateInsights(report);
  if (bullets.length === 0) return;

  const PAD_X = 16;
  const PAD_Y = 12;
  const TITLE_H = 20;
  const BULLET_H = 18;
  const estimatedH = PAD_Y + TITLE_H + bullets.length * BULLET_H + PAD_Y;

  ensureSpace(doc, estimatedH + 16);

  const cardX = M;
  const cardY = doc.y;
  const cardW = CONTENT_WIDTH;

  // Card background
  doc.roundedRect(cardX, cardY, cardW, estimatedH, 6).fillColor('#EFF6FF').fill();
  doc.roundedRect(cardX, cardY, cardW, estimatedH, 6).strokeColor('#BFDBFE').lineWidth(0.5).stroke();
  // Left accent bar
  doc.rect(cardX, cardY, 3, estimatedH).fillColor(C.accent).fill();

  // Title
  fill(doc, C.navy).font('Helvetica-Bold').fontSize(8.5)
    .text('KEY SPENDING INSIGHTS', cardX + PAD_X + 4, cardY + PAD_Y, {
      characterSpacing: 0.5,
      width: cardW - PAD_X * 2,
    });

  // Bullet rows
  const dotX = cardX + PAD_X + 4 + 3;
  const textX = cardX + PAD_X + 4 + 12;
  const textW = cardW - PAD_X * 2 - 16;
  let bulletY = cardY + PAD_Y + TITLE_H;

  bullets.forEach((line) => {
    doc.circle(dotX, bulletY + 4.5, 2.5).fillColor(C.accent).fill();
    fill(doc, C.slate).font('Helvetica').fontSize(8)
      .text(line, textX, bulletY, { width: textW, lineBreak: false });
    bulletY += BULLET_H;
  });

  doc.y = cardY + estimatedH + 14;
}

// ---------------------------------------------------------------------------
// Anomaly table - compact with flag badge
// ---------------------------------------------------------------------------
function drawAnomalyTable(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  if (report.anomalies.length === 0) return;

  // Widths must sum to CONTENT_WIDTH (499) so nothing bleeds off the right edge.
  const _c0 = Math.round(CONTENT_WIDTH * 0.30); // Vendor     ~150
  const _c1 = Math.round(CONTENT_WIDTH * 0.14); // Date       ~70
  const _c2 = Math.round(CONTENT_WIDTH * 0.20); // Amount     ~100
  const _c3 = Math.round(CONTENT_WIDTH * 0.20); // Variance   ~100
  const COL = [_c0, _c1, _c2, _c3, Math.round(CONTENT_WIDTH) - _c0 - _c1 - _c2 - _c3]; // Flag remainder ~79
  const HEADERS = ['Vendor', 'Date', 'Amount (AUD)', 'Variance (AUD)', 'Flag Type'];
  const ROW_H = 22;
  const HEADER_H = 22;
  const startX = M;

  // Keep heading, column headers, and at least one row together.
  ensureSpace(doc, 24 + HEADER_H + ROW_H + 8);
  sectionHeading(doc, 'Anomaly Detail - Flagged Entries Only');

  const drawHeader = () => {
    const headerY = doc.y;
    let hx = startX;

    fill(doc, C.muted).font('Helvetica-Bold').fontSize(7.5);
    HEADERS.forEach((h, i) => {
      const align = i >= 2 ? 'right' : 'left';
      doc.text(h.toUpperCase(), hx, headerY + 5, { width: COL[i]! - 4, align, characterSpacing: 0.4 });
      hx += COL[i]!;
    });

    doc.y = headerY + HEADER_H;

    stroke(doc, C.border).lineWidth(0.5)
      .moveTo(startX, doc.y - 2)
      .lineTo(startX + CONTENT_WIDTH, doc.y - 2)
      .stroke();
  };

  drawHeader();

  report.anomalies.forEach((row) => {
    // Page-break with repeated headers for readability and stable layout.
    if (doc.y + ROW_H > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      drawHeader();
    }

    let cx = startX;
    const rowY = doc.y;
    const cells = [
      row.vendorName,
      row.transactionDate,
      formatMoney(row.totalAmountAud),
      row.varianceAmountAud !== null ? formatMoney(row.varianceAmountAud) : '--',
      row.reason === 'variance_flagged' ? 'Variance Flagged' : 'Price Spike',
    ];

    cells.forEach((cell, ci) => {
      const w = COL[ci]!;
      const isRight = ci >= 2;

      if (ci === 4) {
        const isVariance = cell === 'Variance Flagged';
        doc.roundedRect(cx + 2, rowY + 4, w - 8, 14, 6)
          .fillColor(isVariance ? '#FFF7ED' : '#FFF1F2').fill();
        fill(doc, isVariance ? '#B45309' : '#BE123C').font('Helvetica-Bold').fontSize(7.5)
          .text(cell, cx + 2, rowY + 7, { width: w - 8, align: 'center' });
      } else if (ci === 0) {
        fill(doc, C.navy).font('Helvetica-Bold').fontSize(8.5)
          .text(cell, cx, rowY + 5, { width: w - 4 });
      } else {
        fill(doc, isRight ? C.slate : C.muted).font('Helvetica').fontSize(8.5)
          .text(cell, cx, rowY + 5, { width: w - 4, align: isRight ? 'right' : 'left' });
      }
      cx += w;
    });

    doc.y = rowY + ROW_H;
    stroke(doc, C.divider).lineWidth(0.5)
      .moveTo(startX, doc.y)
      .lineTo(startX + CONTENT_WIDTH, doc.y)
      .stroke();
  });

  doc.moveDown(1);
}

// ---------------------------------------------------------------------------
// Main render entry point
// ---------------------------------------------------------------------------
export function renderMonthlyExpenseReportPdf(report: MonthlyExpenseReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // -----------------------------------------------------------------------
    // HEADER - navy title + side-by-side meta line
    // -----------------------------------------------------------------------
    const generatedStr = new Date(report.generatedAt).toLocaleString('en-AU', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
    const scopeStr = report.currentRangeStart + ' to ' + report.currentRangeEndInclusive
      + '  |  Prior: ' + report.previousRangeStart + ' to ' + report.previousRangeEndInclusive;

    doc.rect(M, 36, CONTENT_WIDTH, 2).fillColor(C.navy).fill();
    doc.y = 48;

    fill(doc, C.navy).font('Helvetica-Bold').fontSize(18)
      .text('Monthly Expense Analytics Report', M, doc.y, { continued: true });
    fill(doc, C.accent).font('Helvetica-Bold').fontSize(18)
      .text(' - ' + report.reportMonthLabel);

    doc.moveDown(0.35);

    const metaY = doc.y;
    fill(doc, C.muted).font('Helvetica').fontSize(8)
      .text('Generated ' + generatedStr, M, metaY, { width: CONTENT_WIDTH / 2, continued: false });
    fill(doc, C.muted).font('Helvetica').fontSize(8)
      .text(scopeStr, M + CONTENT_WIDTH / 2, metaY, { width: CONTENT_WIDTH / 2, align: 'right' });

    doc.y = metaY + 14;

    stroke(doc, C.border).lineWidth(0.5)
      .moveTo(M, doc.y)
      .lineTo(M + CONTENT_WIDTH, doc.y)
      .stroke();

    doc.moveDown(1.2);

    // -----------------------------------------------------------------------
    // SECTION 1 - KPI Grid (Previous Month vs Current Month)
    // -----------------------------------------------------------------------
    sectionHeading(doc, 'Summary Key Metrics');
    drawKpiGrid(doc, report);

    // -----------------------------------------------------------------------
    // SECTION 2 - Spend Distribution: Previous Month (left) vs Current Month (right)
    // Each sub-section (Departments first, then Categories) is rendered as a
    // paired prev/current table. Departments with no data in a month show '--'.
    // -----------------------------------------------------------------------
    sectionHeading(doc, 'Spend Distribution');

    const colW = (CONTENT_WIDTH - 20) / 2;
    const leftX = M;
    const rightX = M + colW + 20;

    // Helper: build a union of department names across both months, ordered by current spend desc
    const allDeptNames = Array.from(new Set([
      ...report.departmentBreakdown.map((r) => r.departmentName),
      ...report.previousDepartmentBreakdown.map((r) => r.departmentName),
    ]));
    const prevDeptMap = new Map(report.previousDepartmentBreakdown.map((r) => [r.departmentName, r.spendAud]));
    const curDeptMap = new Map(report.departmentBreakdown.map((r) => [r.departmentName, { spendAud: r.spendAud, mom: r.momVariationPercent }]));

    // Sort by current spend desc, departments only in prev go at the bottom
    allDeptNames.sort((a, b) => (curDeptMap.get(b)?.spendAud ?? 0) - (curDeptMap.get(a)?.spendAud ?? 0));

    const prevDeptRows = allDeptNames.map((name) => {
      const spend = prevDeptMap.get(name);
      return [name, spend !== undefined ? formatMoney(spend) : '--'];
    });

    const curDeptRows = allDeptNames.map((name) => {
      const entry = curDeptMap.get(name);
      return [name, entry ? formatMoney(entry.spendAud) : '--', entry ? formatPercent(entry.mom) : '--'];
    });

    // Helper: build a union of categories across both months, ordered by current spend desc
    const allCategories = Array.from(new Set([
      ...report.categoryBreakdown.map((r) => r.category),
      ...report.previousCategoryBreakdown.map((r) => r.category),
    ]));
    const prevCatMap = new Map(report.previousCategoryBreakdown.map((r) => [r.category, r]));
    const curCatMap = new Map(report.categoryBreakdown.map((r) => [r.category, r]));

    allCategories.sort((a, b) => (curCatMap.get(b)?.percentOfTotal ?? 0) - (curCatMap.get(a)?.percentOfTotal ?? 0));

    const prevCatRows = allCategories.map((cat) => {
      const entry = prevCatMap.get(cat);
      return [formatCategoryLabel(cat), entry ? formatMoney(entry.spendAud) : '--', entry ? entry.percentOfTotal.toFixed(1) + '%' : '--'];
    });

    const curCatRows = allCategories.map((cat) => {
      const entry = curCatMap.get(cat);
      return [formatCategoryLabel(cat), entry ? formatMoney(entry.spendAud) : '--', entry ? entry.percentOfTotal.toFixed(1) + '%' : '--'];
    });

    // --- Column header row ---
    const distColHeaderY = doc.y;
    fill(doc, C.muted).font('Helvetica-Bold').fontSize(10)
      .text('PREVIOUS MONTH', leftX, distColHeaderY, { width: colW, align: 'center', characterSpacing: 0.6 });
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(10)
      .text('CURRENT MONTH', rightX, distColHeaderY, { width: colW, align: 'center', characterSpacing: 0.6 });
    doc.y = distColHeaderY + 24;

    const distDivX = M + colW + 10;

    // --- Sub-section: Top Operational Units ---
    // Guard: ensure enough vertical space for BOTH columns (pie + table) before
    // starting the sub-section so left and right always share the same page.
    const maxDeptRowCount = Math.max(prevDeptRows.length, curDeptRows.length);
    ensureSpace(doc, 16 + 96 + 22 + maxDeptRowCount * 20 + 14);

    const deptSubY = doc.y;
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(9)
      .text('Top Operational Units', leftX, deptSubY);
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(9)
      .text('Top Operational Units', rightX, deptSubY);
    const deptDataY = deptSubY + 16;

    const deptPrevWidths = [Math.round(colW * 0.58), Math.round(colW * 0.42)];
    const deptCurWidths = [Math.round(colW * 0.46), Math.round(colW * 0.31), Math.round(colW * 0.23)];

    // Dept pie chart for previous month (left column)
    const prevDeptPieSlices = allDeptNames
      .map((name) => ({ label: name, value: prevDeptMap.get(name) ?? 0 }))
      .filter((s) => s.value > 0);
    const prevDeptPieEndY = prevDeptPieSlices.length > 0 ? drawPieChart(doc, prevDeptPieSlices, leftX, deptDataY, colW) : deptDataY;

    const deptLeftEnd = prevDeptRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Department', 'Spend'],
          rows: prevDeptRows,
          widths: deptPrevWidths,
          rightAlignColumns: [1],
          startX: leftX,
          startY: prevDeptPieEndY,
          availableWidth: colW,
        })
      : prevDeptPieEndY + 20;

    // Dept pie chart for current month (right column only)
    const deptPieSlices = allDeptNames
      .map((name) => ({ label: name, value: curDeptMap.get(name)?.spendAud ?? 0 }))
      .filter((s) => s.value > 0);
    const deptPieEndY = deptPieSlices.length > 0 ? drawPieChart(doc, deptPieSlices, rightX, deptDataY, colW) : deptDataY;

    const deptRightEnd = curDeptRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Department', 'Spend', 'MoM'],
          rows: curDeptRows,
          widths: deptCurWidths,
          rightAlignColumns: [1, 2],
          momColumns: [2],
          startX: rightX,
          startY: deptPieEndY,
          availableWidth: colW,
        })
      : deptPieEndY + 20;

    // Dept sub-section divider (drawn immediately while still on the same page)
    const deptSectionEndY = Math.max(deptLeftEnd, deptRightEnd) + 8;
    stroke(doc, C.border).lineWidth(1)
      .moveTo(distDivX, deptSubY - 4)
      .lineTo(distDivX, deptSectionEndY)
      .stroke();
    doc.y = deptSectionEndY + 14;

    // --- Sub-section: By Expense Category ---
    // Same guard: keep both columns on the same page.
    const maxCatRowCount = Math.max(prevCatRows.length, curCatRows.length);
    ensureSpace(doc, 16 + 96 + 22 + maxCatRowCount * 20 + 14);

    const catSubY = doc.y;
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(9)
      .text('By Expense Category', leftX, catSubY);
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(9)
      .text('By Expense Category', rightX, catSubY);
    const catDataY = catSubY + 16;

    const catWidths = [Math.round(colW * 0.46), Math.round(colW * 0.31), Math.round(colW * 0.23)];

    // Category pie chart for previous month (left column)
    const prevCatPieSlices = allCategories
      .map((cat) => ({ label: formatCategoryLabel(cat), value: prevCatMap.get(cat)?.spendAud ?? 0 }))
      .filter((s) => s.value > 0);
    const prevCatPieEndY = prevCatPieSlices.length > 0 ? drawPieChart(doc, prevCatPieSlices, leftX, catDataY, colW) : catDataY;

    const catLeftEnd = prevCatRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Category', 'Amount', '%'],
          rows: prevCatRows,
          widths: catWidths,
          rightAlignColumns: [1, 2],
          startX: leftX,
          startY: prevCatPieEndY,
          availableWidth: colW,
        })
      : prevCatPieEndY + 20;

    // Category pie chart for current month (right column only)
    const catPieSlices = allCategories
      .map((cat) => ({ label: formatCategoryLabel(cat), value: curCatMap.get(cat)?.spendAud ?? 0 }))
      .filter((s) => s.value > 0);
    const catPieEndY = catPieSlices.length > 0 ? drawPieChart(doc, catPieSlices, rightX, catDataY, colW) : catDataY;

    const catRightEnd = curCatRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Category', 'Amount', '%'],
          rows: curCatRows,
          widths: catWidths,
          rightAlignColumns: [1, 2],
          startX: rightX,
          startY: catPieEndY,
          availableWidth: colW,
        })
      : catPieEndY + 20;

    // Category sub-section divider
    const catSectionEndY = Math.max(catLeftEnd, catRightEnd) + 8;
    stroke(doc, C.border).lineWidth(1)
      .moveTo(distDivX, catSubY - 4)
      .lineTo(distDivX, catSectionEndY)
      .stroke();

    doc.y = catSectionEndY + 12;

    // -----------------------------------------------------------------------
    // SECTION 3 - Key Insights card
    // -----------------------------------------------------------------------
    drawInsightsCard(doc, report);

    // -----------------------------------------------------------------------
    // SECTION 4 - Anomalies (conditional - only when variance/price-spike flags tripped)
    // -----------------------------------------------------------------------
    drawAnomalyTable(doc, report);

    // -----------------------------------------------------------------------
    // Footer - page numbers injected before end() while buffer still open
    // Remove any trailing page that was created by ensureSpace but left empty.
    // -----------------------------------------------------------------------
    const range = doc.bufferedPageRange();
    let lastContentPage = range.count - 1;
    // A page is empty when doc.y is at (or very near) the top margin — use a
    // 20px threshold to catch pages where a page-break was triggered but only
    // a single divider line or cursor move was left behind.
    while (lastContentPage > 0) {
      doc.switchToPage(lastContentPage);
      if (doc.y > doc.page.margins.top + 20) break;
      lastContentPage--;
    }
    const totalPages = lastContentPage + 1;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      fill(doc, C.faint).font('Helvetica').fontSize(7.5)
        .text(
          'Control Hub  |  Confidential  |  Page ' + (i + 1) + ' of ' + totalPages,
          M,
          doc.page.height - 28,
          { width: CONTENT_WIDTH, align: 'center' }
        );
    }

    doc.end();
  });
}
