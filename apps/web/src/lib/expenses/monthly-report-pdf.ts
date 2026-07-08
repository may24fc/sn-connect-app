import PDFDocument from 'pdfkit';
import type { MonthlyExpenseReport } from './monthly-report';

const PAGE_MARGIN = 48;
const COLOR_TEXT = '#18181b';
const COLOR_MUTED = '#71717a';
const COLOR_BORDER = '#e4e4e7';
const COLOR_HEADER_BG = '#eef2ff';
const COLOR_ACCENT = '#4f46e5';

const STATUS_LABELS: Record<'autoApproved' | 'awaitingInternReview' | 'approved' | 'draftExtracted', string> = {
  autoApproved: 'Auto-approved',
  awaitingInternReview: 'Awaiting intern review',
  approved: 'Approved',
  draftExtracted: 'Draft Extracted',
};

function formatMoney(value: number): string {
  return `AUD ${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return 'New';
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Ensures the next block of `height` points fits on the current page; otherwise starts a new page. */
function ensureSpace(doc: PDFKit.PDFDocument, height: number): void {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + height > bottom) {
    doc.addPage();
  }
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 40);
  doc.fontSize(13).fillColor(COLOR_TEXT).font('Helvetica-Bold').text(title, { continued: false });
  doc.moveDown(0.3);
  doc
    .strokeColor(COLOR_BORDER)
    .lineWidth(1)
    .moveTo(doc.x, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.5);
}

interface TableOptions {
  columnWidths: number[];
  headers: string[];
  rows: string[][];
  /** Column indices (0-based) to right-align, typically money/percent columns. */
  rightAlignColumns?: number[];
}

const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 24;

function drawTable(doc: PDFKit.PDFDocument, options: TableOptions): void {
  const { columnWidths, headers, rows, rightAlignColumns = [] } = options;
  const startX = doc.page.margins.left;
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);

  ensureSpace(doc, HEADER_HEIGHT + ROW_HEIGHT);

  const drawHeaderRow = () => {
    const headerY = doc.y;
    doc.rect(startX, headerY, tableWidth, HEADER_HEIGHT).fill(COLOR_HEADER_BG);
    doc.fillColor(COLOR_ACCENT).font('Helvetica-Bold').fontSize(9);

    let cursorX = startX;
    headers.forEach((header, index) => {
      const width = columnWidths[index] ?? 0;
      const align = rightAlignColumns.includes(index) ? 'right' : 'left';
      doc.text(header, cursorX + 6, headerY + 7, { width: width - 12, align });
      cursorX += width;
    });

    doc.y = headerY + HEADER_HEIGHT;
  };

  drawHeaderRow();

  doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXT);

  rows.forEach((row, rowIndex) => {
    ensureSpace(doc, ROW_HEIGHT);

    // Re-draw header if a page break occurred mid-table so context isn't lost.
    if (doc.y === doc.page.margins.top) {
      drawHeaderRow();
      doc.font('Helvetica').fontSize(9).fillColor(COLOR_TEXT);
    }

    const rowY = doc.y;

    if (rowIndex % 2 === 1) {
      doc.rect(startX, rowY, tableWidth, ROW_HEIGHT).fill('#fafafa');
      doc.fillColor(COLOR_TEXT);
    }

    let cursorX = startX;
    row.forEach((cell, columnIndex) => {
      const width = columnWidths[columnIndex] ?? 0;
      const align = rightAlignColumns.includes(columnIndex) ? 'right' : 'left';
      doc.text(cell, cursorX + 6, rowY + 6, { width: width - 12, align });
      cursorX += width;
    });

    doc
      .strokeColor(COLOR_BORDER)
      .lineWidth(0.5)
      .moveTo(startX, rowY + ROW_HEIGHT)
      .lineTo(startX + tableWidth, rowY + ROW_HEIGHT)
      .stroke();

    doc.y = rowY + ROW_HEIGHT;
  });

  doc.moveDown(0.8);
}

/**
 * Renders the consolidated monthly executive expense report into a PDF buffer.
 * Layout: header block, summary KPI comparison, category/department
 * distributions, audit pipeline status box, and an anomaly section that only
 * appears when flagged (variance/price-spike) entries exist that month.
 */
export function renderMonthlyExpenseReportPdf(report: MonthlyExpenseReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // --- Header block ---
    doc.fontSize(18).fillColor(COLOR_TEXT).font('Helvetica-Bold').text(`Monthly Expense Analytics Report — ${report.reportMonthLabel}`);
    doc.moveDown(0.2);
    doc
      .fontSize(9)
      .fillColor(COLOR_MUTED)
      .font('Helvetica')
      .text(`Generated ${new Date(report.generatedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}`);
    doc.text(
      `Reporting scope: ${report.currentRangeStart} to ${report.currentRangeEndInclusive} (compared against ${report.previousRangeStart} to ${report.previousRangeEndInclusive})`
    );
    doc.moveDown(1);

    // --- Section 1: Summary key metrics ---
    drawSectionTitle(doc, 'Summary Key Metrics');
    drawTable(doc, {
      columnWidths: [180, 110, 110, 100],
      headers: ['Metric', 'Current Month', 'Previous Month', 'MoM % Change'],
      rightAlignColumns: [1, 2, 3],
      rows: report.summary.map((row) => [
        row.metric,
        row.metric.includes('Spend') ? formatMoney(row.currentMonth) : row.currentMonth.toLocaleString('en-AU'),
        row.metric.includes('Spend') ? formatMoney(row.previousMonth) : row.previousMonth.toLocaleString('en-AU'),
        formatPercent(row.momPercentChange),
      ]),
    });

    // --- Section 2a: Spend by expense category ---
    drawSectionTitle(doc, 'Spend by Expense Category');
    if (report.categoryBreakdown.length === 0) {
      doc.fontSize(9).fillColor(COLOR_MUTED).text('No categorized spend recorded this period.');
      doc.moveDown(0.8);
    } else {
      drawTable(doc, {
        columnWidths: [220, 140, 140],
        headers: ['Category Name', 'Spend Amount', '% of Total Spend'],
        rightAlignColumns: [1, 2],
        rows: report.categoryBreakdown.map((row) => [
          formatCategoryLabel(row.category),
          formatMoney(row.spendAud),
          `${row.percentOfTotal.toFixed(1)}%`,
        ]),
      });
    }

    // --- Section 2b: Top operational units ---
    drawSectionTitle(doc, 'Top Operational Units');
    if (report.departmentBreakdown.length === 0) {
      doc.fontSize(9).fillColor(COLOR_MUTED).text('No department-attributed spend recorded this period.');
      doc.moveDown(0.8);
    } else {
      drawTable(doc, {
        columnWidths: [220, 140, 140],
        headers: ['Department Name', 'Allocated Spend', 'MoM Variation'],
        rightAlignColumns: [1, 2],
        rows: report.departmentBreakdown.map((row) => [
          row.departmentName,
          formatMoney(row.spendAud),
          formatPercent(row.momVariationPercent),
        ]),
      });
    }

    // --- Section 3: Audit system pipeline status ---
    drawSectionTitle(doc, 'Audit System Pipeline Status');
    const statusEntries = Object.entries(STATUS_LABELS) as Array<
      [keyof typeof STATUS_LABELS, string]
    >;
    const boxWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 3 * 10) / 4;
    const boxHeight = 56;
    ensureSpace(doc, boxHeight + 10);
    const boxY = doc.y;
    statusEntries.forEach(([key, label], index) => {
      const boxX = doc.page.margins.left + index * (boxWidth + 10);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 4).fillAndStroke(COLOR_HEADER_BG, COLOR_BORDER);
      doc
        .fillColor(COLOR_ACCENT)
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(String(report.pipelineStatus[key]), boxX, boxY + 10, { width: boxWidth, align: 'center' });
      doc
        .fillColor(COLOR_MUTED)
        .font('Helvetica')
        .fontSize(8)
        .text(label, boxX + 4, boxY + 34, { width: boxWidth - 8, align: 'center' });
    });
    doc.y = boxY + boxHeight + 16;

    // --- Anomaly detail (only rendered when a variance/price-spike flag tripped) ---
    if (report.anomalies.length > 0) {
      drawSectionTitle(doc, 'Anomaly Detail (Flagged Entries Only)');
      drawTable(doc, {
        columnWidths: [150, 90, 110, 110, 90],
        headers: ['Vendor', 'Date', 'Amount', 'Variance', 'Flag'],
        rightAlignColumns: [2, 3],
        rows: report.anomalies.map((row) => [
          row.vendorName,
          row.transactionDate,
          formatMoney(row.totalAmountAud),
          row.varianceAmountAud !== null ? formatMoney(row.varianceAmountAud) : '—',
          row.reason === 'variance_flagged' ? 'Variance Flagged' : 'Price Spike',
        ]),
      });
    }

    doc.end();
  });
}
