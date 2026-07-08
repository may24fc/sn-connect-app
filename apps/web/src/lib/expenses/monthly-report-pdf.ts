import PDFDocument from 'pdfkit';
import type { MonthlyExpenseReport } from './monthly-report';

// ---------------------------------------------------------------------------
// Design tokens â€” corporate executive palette
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
  // Edge case: previous month was 0 â†’ neutral dash instead of "New"
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

  fill(doc, C.navy).font('Helvetica-Bold').fontSize(10)
    .text(title.toUpperCase(), M + 10, headY + 2, { characterSpacing: 0.8 });

  doc.y = headY + 24;
}

// ---------------------------------------------------------------------------
// KPI cards â€” three horizontal cards
// ---------------------------------------------------------------------------
function drawKpiCards(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  ensureSpace(doc, 80);

  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap * 2) / 3;
  const cardHeight = 72;
  const startY = doc.y;

  report.summary.forEach((item, i) => {
    const cardX = M + i * (cardWidth + gap);
    const isSpend = item.metric.includes('Spend');

    // Card background + border
    doc.roundedRect(cardX, startY, cardWidth, cardHeight, 6)
      .fillColor(C.cardBg).fill()
      .roundedRect(cardX, startY, cardWidth, cardHeight, 6)
      .strokeColor(C.border).lineWidth(1).stroke();

    // Metric label
    fill(doc, C.muted).font('Helvetica').fontSize(7.5)
      .text(item.metric.toUpperCase(), cardX + 12, startY + 11, {
        width: cardWidth - 24,
        characterSpacing: 0.5,
      });

    // Primary value â€” large + bold
    const primaryText = isSpend ? formatMoneyShort(item.currentMonth) : String(item.currentMonth);
    const prefixText = isSpend ? 'AUD ' : '';

    if (isSpend) {
      fill(doc, C.muted).font('Helvetica').fontSize(9)
        .text(prefixText, cardX + 12, startY + 26, { continued: true });
      fill(doc, C.navy).font('Helvetica-Bold').fontSize(15)
        .text(primaryText, { continued: false });
    } else {
      fill(doc, C.navy).font('Helvetica-Bold').fontSize(15)
        .text(primaryText, cardX + 12, startY + 26);
    }

    // Previous month row
    const prevText = isSpend ? `Prev: ${formatMoney(item.previousMonth)}` : `Prev: ${item.previousMonth}`;
    fill(doc, C.faint).font('Helvetica').fontSize(7.5)
      .text(prevText, cardX + 12, startY + 47, { width: cardWidth - 80 });

    // MoM badge â€” top-right
    const momVal = item.momPercentChange;
    const momLabel = momVal === null ? '--' : formatPercent(momVal);
    const momC = momColor(momVal);
    const momBadgeW = 44;
    const momBadgeX = cardX + cardWidth - momBadgeW - 10;

    doc.roundedRect(momBadgeX, startY + cardHeight - 22, momBadgeW, 14, 3)
      .fillColor(momC === C.rose ? '#FFF1F2' : momC === C.emerald ? '#ECFDF5' : C.cardBg)
      .fill();
    fill(doc, momC).font('Helvetica-Bold').fontSize(7.5)
      .text(momLabel, momBadgeX, startY + cardHeight - 20, { width: momBadgeW, align: 'center' });
  });

  doc.y = startY + cardHeight + 20;
}

// ---------------------------------------------------------------------------
// Borderless list table (category or department column pair)
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

  // Column headers â€” muted caps, no fill background
  fill(doc, C.muted).font('Helvetica-Bold').fontSize(7.5);
  let cx = startX;
  headers.forEach((h, i) => {
    const w = widths[i] ?? 0;
    const align = rightAlignColumns.includes(i) ? 'right' : 'left';
    doc.text(h.toUpperCase(), cx, curY + 5, { width: w - 4, align, characterSpacing: 0.4 });
    cx += w;
  });

  curY += HEADER_H;

  // Thin full-width rule under header
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

    // subtle bottom rule
    stroke(doc, C.divider).lineWidth(0.5)
      .moveTo(startX, curY)
      .lineTo(startX + availableWidth, curY)
      .stroke();
  });

  return curY + 8; // return final Y
}

// ---------------------------------------------------------------------------
// Pipeline status pills â€” horizontal row
// ---------------------------------------------------------------------------
function drawPipelinePills(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  const pillDefs: Array<{ label: string; count: number; bg: string; textColor: string }> = [
    { label: 'Draft Extracted', count: report.pipelineStatus.draftExtracted, bg: C.pillDraft, textColor: C.pillDraftText },
    { label: 'Awaiting Review', count: report.pipelineStatus.awaitingInternReview, bg: C.pillBlue, textColor: C.pillBlueText },
    { label: 'Approved', count: report.pipelineStatus.approved, bg: C.pillGreen, textColor: C.pillGreenText },
    { label: 'Auto-Approved', count: report.pipelineStatus.autoApproved, bg: C.pillGreen, textColor: C.pillGreenText },
  ];

  const gap = 8;
  const pillW = (CONTENT_WIDTH - gap * 3) / 4;
  const pillH = 52;
  ensureSpace(doc, pillH + 16);

  const baseY = doc.y;

  pillDefs.forEach((pill, i) => {
    const px = M + i * (pillW + gap);

    // Pill background
    doc.roundedRect(px, baseY, pillW, pillH, 20)
      .fillColor(pill.bg).fill();

    // Count â€” large centred
    fill(doc, pill.textColor).font('Helvetica-Bold').fontSize(20)
      .text(String(pill.count), px, baseY + 8, { width: pillW, align: 'center' });

    // Label
    fill(doc, pill.textColor).font('Helvetica').fontSize(7.5)
      .text(pill.label, px + 4, baseY + 33, { width: pillW - 8, align: 'center' });
  });

  doc.y = baseY + pillH + 18;
}

// ---------------------------------------------------------------------------
// Anomaly table â€” compact with flag badge
// ---------------------------------------------------------------------------
function drawAnomalyTable(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  if (report.anomalies.length === 0) return;

  ensureSpace(doc, 60);
  sectionHeading(doc, 'Anomaly Detail â€” Flagged Entries Only');

  const COL = [180, 80, 110, 110, 90];
  const HEADERS = ['Vendor', 'Date', 'Amount (AUD)', 'Variance (AUD)', 'Flag Type'];
  const ROW_H = 22;
  const HEADER_H = 22;
  const startX = M;

  // Header row
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
      row.varianceAmountAud !== null ? formatMoney(row.varianceAmountAud) : 'â€”',
      row.reason === 'variance_flagged' ? 'Variance Flagged' : 'Price Spike',
    ];

    cells.forEach((cell, ci) => {
      const w = COL[ci]!;
      const isRight = ci >= 2;

      if (ci === 4) {
        // Flag badge
        const isVariance = cell === 'Variance Flagged';
        const badgeBg = isVariance ? '#FFF7ED' : '#FFF1F2';
        const badgeText = isVariance ? '#B45309' : '#BE123C';
        doc.roundedRect(cx + 2, rowY + 4, w - 8, 14, 6).fillColor(badgeBg).fill();
        fill(doc, badgeText).font('Helvetica-Bold').fontSize(7.5)
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
    // HEADER â€” navy title + side-by-side meta line
    // -----------------------------------------------------------------------
    const generatedStr = new Date(report.generatedAt).toLocaleString('en-AU', {
      dateStyle: 'long',
      timeStyle: 'short',
    });
    const scopeStr = `${report.currentRangeStart} â€“ ${report.currentRangeEndInclusive}  Â·  Prior: ${report.previousRangeStart} â€“ ${report.previousRangeEndInclusive}`;

    // Top rule
    doc.rect(M, 36, CONTENT_WIDTH, 2).fillColor(C.navy).fill();
    doc.y = 48;

    fill(doc, C.navy).font('Helvetica-Bold').fontSize(18)
      .text('Monthly Expense Analytics Report', M, doc.y, { continued: true });
    fill(doc, C.accent).font('Helvetica-Bold').fontSize(18)
      .text(` â€” ${report.reportMonthLabel}`);

    doc.moveDown(0.35);

    // Side-by-side generated + scope (same line)
    const metaY = doc.y;
    fill(doc, C.muted).font('Helvetica').fontSize(8)
      .text(`Generated ${generatedStr}`, M, metaY, { width: CONTENT_WIDTH / 2, continued: false });
    fill(doc, C.muted).font('Helvetica').fontSize(8)
      .text(scopeStr, M + CONTENT_WIDTH / 2, metaY, { width: CONTENT_WIDTH / 2, align: 'right' });

    doc.y = metaY + 14;

    // Bottom rule
    stroke(doc, C.border).lineWidth(0.5)
      .moveTo(M, doc.y)
      .lineTo(M + CONTENT_WIDTH, doc.y)
      .stroke();

    doc.moveDown(1.2);

    // -----------------------------------------------------------------------
    // SECTION 1 â€” KPI Cards
    // -----------------------------------------------------------------------
    sectionHeading(doc, 'Summary Key Metrics');
    drawKpiCards(doc, report);

    // -----------------------------------------------------------------------
    // SECTION 2 â€” Two-column: Category + Department side by side
    // -----------------------------------------------------------------------
    sectionHeading(doc, 'Spend Distribution');

    const colW = (CONTENT_WIDTH - 20) / 2;
    const leftX = M;
    const rightX = M + colW + 20;

    const catRows = report.categoryBreakdown.map((r) => [
      formatCategoryLabel(r.category),
      formatMoney(r.spendAud),
      `${r.percentOfTotal.toFixed(1)}%`,
    ]);

    const deptRows = report.departmentBreakdown.map((r) => [
      r.departmentName,
      formatMoney(r.spendAud),
      formatPercent(r.momVariationPercent),
    ]);

    const twoColStartY = doc.y;

    // Sub-label for left column
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(8.5)
      .text('By Expense Category', leftX, twoColStartY);
    // Sub-label for right column
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(8.5)
      .text('Top Operational Units', rightX, twoColStartY);

    const subLabelH = 18;
    const twoColDataY = twoColStartY + subLabelH;

    const leftEnd = catRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Category', 'Amount', '%'],
          rows: catRows,
          widths: [Math.round(colW * 0.5), Math.round(colW * 0.33), Math.round(colW * 0.17)],
          rightAlignColumns: [1, 2],
          startX: leftX,
          startY: twoColDataY,
          availableWidth: colW,
        })
      : twoColDataY;

    const rightEnd = deptRows.length > 0
      ? drawListColumn(doc, {
          title: '',
          headers: ['Department', 'Spend', 'MoM'],
          rows: deptRows,
          widths: [Math.round(colW * 0.5), Math.round(colW * 0.33), Math.round(colW * 0.17)],
          rightAlignColumns: [1, 2],
          startX: rightX,
          startY: twoColDataY,
          availableWidth: colW,
        })
      : twoColDataY;

    // Advance doc.y past the taller column
    doc.y = Math.max(leftEnd, rightEnd) + 12;

    // -----------------------------------------------------------------------
    // SECTION 3 â€” Pipeline Status Pills
    // -----------------------------------------------------------------------
    sectionHeading(doc, 'Audit Pipeline Status');
    drawPipelinePills(doc, report);

    // -----------------------------------------------------------------------
    // SECTION 4 â€” Anomalies (conditional)
    // -----------------------------------------------------------------------
    drawAnomalyTable(doc, report);

    // -----------------------------------------------------------------------
    // Footer â€” page numbers injected before end() while buffer still open
    // -----------------------------------------------------------------------
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      fill(doc, C.faint).font('Helvetica').fontSize(7.5)
        .text(
          `Control Hub  Â·  Confidential  Â·  Page ${i + 1} of ${totalPages}`,
          M,
          doc.page.height - 28,
          { width: CONTENT_WIDTH, align: 'center' }
        );
    }

    doc.end();
  });
}
