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
  const headY = y ?? doc.y;
  ensureSpace(doc, 32);

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
  startX: number;
  startY: number;
  availableWidth: number;
}

function drawListColumn(doc: PDFKit.PDFDocument, opts: ListColumnOptions): number {
  const { headers, rows, widths, rightAlignColumns = [], startX, availableWidth } = opts;
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
    ensureSpace(doc, ROW_H);
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
// Anomaly table - compact with flag badge
// ---------------------------------------------------------------------------
function drawAnomalyTable(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  if (report.anomalies.length === 0) return;

  ensureSpace(doc, 60);
  sectionHeading(doc, 'Anomaly Detail - Flagged Entries Only');

  const COL = [180, 80, 110, 110, 90];
  const HEADERS = ['Vendor', 'Date', 'Amount (AUD)', 'Variance (AUD)', 'Flag Type'];
  const ROW_H = 22;
  const HEADER_H = 22;
  const startX = M;

  let cx = startX;
  fill(doc, C.muted).font('Helvetica-Bold').fontSize(7.5);
  HEADERS.forEach((h, i) => {
    const align = i >= 2 ? 'right' : 'left';
    doc.text(h.toUpperCase(), cx, doc.y + 5, { width: COL[i]! - 4, align, characterSpacing: 0.4 });
    cx += COL[i]!;
  });
  doc.y += HEADER_H;

  stroke(doc, C.border).lineWidth(0.5)
    .moveTo(startX, doc.y - 2)
    .lineTo(startX + CONTENT_WIDTH, doc.y - 2)
    .stroke();

  report.anomalies.forEach((row) => {
    ensureSpace(doc, ROW_H);
    cx = startX;
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

    allCategories.sort((a, b) => (curCatMap.get(b)?.spendAud ?? 0) - (curCatMap.get(a)?.spendAud ?? 0));

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
    doc.y = distColHeaderY + 16;

    // Vertical divider for entire section
    const distDivX = M + colW + 10;
    const distSectionStartY = doc.y;

    // --- Sub-section: Top Operational Units ---
    const deptSubY = doc.y;
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(9)
      .text('Top Operational Units', leftX, deptSubY);
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(9)
      .text('Top Operational Units', rightX, deptSubY);
    const deptDataY = deptSubY + 16;

    const deptPrevWidths = [Math.round(colW * 0.58), Math.round(colW * 0.42)];
    const deptCurWidths = [Math.round(colW * 0.46), Math.round(colW * 0.31), Math.round(colW * 0.23)];

    const deptLeftEnd = prevDeptRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Department', 'Spend'],
          rows: prevDeptRows,
          widths: deptPrevWidths,
          rightAlignColumns: [1],
          startX: leftX,
          startY: deptDataY,
          availableWidth: colW,
        })
      : deptDataY + 20;

    const deptRightEnd = curDeptRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Department', 'Spend', 'MoM'],
          rows: curDeptRows,
          widths: deptCurWidths,
          rightAlignColumns: [1, 2],
          startX: rightX,
          startY: deptDataY,
          availableWidth: colW,
        })
      : deptDataY + 20;

    doc.y = Math.max(deptLeftEnd, deptRightEnd) + 14;

    // --- Sub-section: By Expense Category ---
    const catSubY = doc.y;
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(9)
      .text('By Expense Category', leftX, catSubY);
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(9)
      .text('By Expense Category', rightX, catSubY);
    const catDataY = catSubY + 16;

    const catWidths = [Math.round(colW * 0.46), Math.round(colW * 0.31), Math.round(colW * 0.23)];

    const catLeftEnd = prevCatRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Category', 'Amount', '%'],
          rows: prevCatRows,
          widths: catWidths,
          rightAlignColumns: [1, 2],
          startX: leftX,
          startY: catDataY,
          availableWidth: colW,
        })
      : catDataY + 20;

    const catRightEnd = curCatRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Category', 'Amount', '%'],
          rows: curCatRows,
          widths: catWidths,
          rightAlignColumns: [1, 2],
          startX: rightX,
          startY: catDataY,
          availableWidth: colW,
        })
      : catDataY + 20;

    // Draw divider spanning the full section height
    stroke(doc, C.border).lineWidth(1)
      .moveTo(distDivX, distSectionStartY - 4)
      .lineTo(distDivX, Math.max(catLeftEnd, catRightEnd) + 4)
      .stroke();

    doc.y = Math.max(catLeftEnd, catRightEnd) + 12;

    // -----------------------------------------------------------------------
    // SECTION 3 - Anomalies (conditional - only when variance/price-spike flags tripped)
    // -----------------------------------------------------------------------
    drawAnomalyTable(doc, report);

    // -----------------------------------------------------------------------
    // Footer - page numbers injected before end() while buffer still open
    // -----------------------------------------------------------------------
    const totalPages = doc.bufferedPageRange().count;
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
