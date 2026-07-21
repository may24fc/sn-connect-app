import PDFDocument from 'pdfkit';
import type { MonthlyExpenseReport } from './monthly-report';

const MARGIN = 48;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_TEXT = 'Control Hub | Confidential';

function formatMoney(value: number): string {
  return `AUD ${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number): void {
  if (doc.y + neededHeight <= doc.page.height - MARGIN) {
    return;
  }
  doc.addPage();
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 26);
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#1E293B').text(title.toUpperCase(), MARGIN, doc.y);
  doc.moveTo(MARGIN, doc.y + 3).lineTo(PAGE_WIDTH - MARGIN, doc.y + 3).strokeColor('#E2E8F0').stroke();
  doc.moveDown(0.6);
}

function drawSimpleTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
): void {
  const headerHeight = 20;
  const rowHeight = 18;

  ensureSpace(doc, headerHeight + rowHeight);

  let x = MARGIN;
  const headerY = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#334155');
  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i] ?? '';
    const width = columnWidths[i] ?? 0;
    doc.text(header, x + 4, headerY + 5, {
      width: width - 8,
      align: i === 0 ? 'left' : 'right',
    });
    x += width;
  }

  doc
    .moveTo(MARGIN, headerY + headerHeight)
    .lineTo(MARGIN + CONTENT_WIDTH, headerY + headerHeight)
    .strokeColor('#CBD5E1')
    .stroke();

  doc.y = headerY + headerHeight + 2;
  doc.font('Helvetica').fontSize(9).fillColor('#334155');

  for (const row of rows) {
    ensureSpace(doc, rowHeight + 4);

    const y = doc.y;
    let rowX = MARGIN;
    for (let i = 0; i < headers.length; i += 1) {
      const value = row[i] ?? '--';
      const width = columnWidths[i] ?? 0;
      doc.text(value, rowX + 4, y + 4, {
        width: width - 8,
        align: i === 0 ? 'left' : 'right',
      });
      rowX += width;
    }

    doc
      .moveTo(MARGIN, y + rowHeight)
      .lineTo(MARGIN + CONTENT_WIDTH, y + rowHeight)
      .strokeColor('#E2E8F0')
      .stroke();

    doc.y = y + rowHeight + 2;
  }

  doc.moveDown(0.4);
}

function collectInsights(report: MonthlyExpenseReport): string[] {
  const lines: string[] = [];

  const totalItem = report.summary.find((item) => item.metric.toLowerCase().includes('total spend'));
  if (totalItem && totalItem.momPercentChange !== null) {
    const direction = totalItem.momPercentChange > 0 ? 'increased' : 'decreased';
    lines.push(
      `Total spend ${direction} by ${Math.abs(totalItem.momPercentChange).toFixed(1)}% MoM (${formatMoney(totalItem.previousMonth)} -> ${formatMoney(totalItem.currentMonth)}).`,
    );
  }

  const topCategory = report.categoryBreakdown[0];
  if (topCategory) {
    lines.push(
      `${formatCategoryLabel(topCategory.category)} is the largest category at ${topCategory.percentOfTotal.toFixed(1)}% (${formatMoney(topCategory.spendAud)}).`,
    );
  }

  if (report.anomalies.length > 0) {
    lines.push(`${report.anomalies.length} anomaly entries were flagged for review.`);
  } else {
    lines.push('No anomalies were flagged in this reporting window.');
  }

  return lines;
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const y = doc.page.height - MARGIN - 12;
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#94A3B8')
    .text(FOOTER_TEXT, MARGIN, y, { width: CONTENT_WIDTH, align: 'center', lineBreak: false });
}

export async function renderMonthlyExpenseReportPdf(report: MonthlyExpenseReport): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      info: {
        Title: `Monthly Expense Analytics Report - ${report.reportMonthLabel}`,
        Author: 'Control Hub',
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', (error) => reject(error));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#1E293B').text(`Monthly Expense Analytics Report - ${report.reportMonthLabel}`);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(`Generated ${new Date(report.generatedAt).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' })}`);
    doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(
      `${report.currentRangeStart} to ${report.currentRangeEndInclusive} | Prior: ${report.previousRangeStart} to ${report.previousRangeEndInclusive}`,
    );
    doc.moveDown(0.8);

    drawSectionTitle(doc, 'Summary Key Metrics');
    drawSimpleTable(
      doc,
      ['Metric', 'Previous Month', 'Current Month', 'MoM'],
      report.summary.map((item) => [
        item.metric,
        formatMoney(item.previousMonth),
        formatMoney(item.currentMonth),
        formatPercent(item.momPercentChange),
      ]),
      [CONTENT_WIDTH * 0.34, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.22],
    );

    drawSectionTitle(doc, 'Department Spend');
    drawSimpleTable(
      doc,
      ['Department', 'Amount (AUD)', 'MoM'],
      report.departmentBreakdown.map((row) => [
        row.departmentName,
        formatMoney(row.spendAud),
        formatPercent(row.momVariationPercent),
      ]),
      [CONTENT_WIDTH * 0.48, CONTENT_WIDTH * 0.28, CONTENT_WIDTH * 0.24],
    );

    drawSectionTitle(doc, 'Expense Category Breakdown');
    drawSimpleTable(
      doc,
      ['Category', 'Amount (AUD)', '% of Total'],
      report.categoryBreakdown.map((row) => [
        formatCategoryLabel(row.category),
        formatMoney(row.spendAud),
        `${row.percentOfTotal.toFixed(1)}%`,
      ]),
      [CONTENT_WIDTH * 0.48, CONTENT_WIDTH * 0.28, CONTENT_WIDTH * 0.24],
    );

    drawSectionTitle(doc, 'Pipeline Status');
    drawSimpleTable(
      doc,
      ['Status', 'Count'],
      [
        ['Auto Approved', String(report.pipelineStatus.autoApproved)],
        ['Awaiting Associate Review', String(report.pipelineStatus.awaitingAssociateReview)],
        ['Approved', String(report.pipelineStatus.approved)],
        ['Draft Extracted', String(report.pipelineStatus.draftExtracted)],
      ],
      [CONTENT_WIDTH * 0.7, CONTENT_WIDTH * 0.3],
    );

    drawSectionTitle(doc, 'Key Spending Insights');
    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    for (const line of collectInsights(report)) {
      ensureSpace(doc, 18);
      doc.text(`- ${line}`, MARGIN, doc.y, { width: CONTENT_WIDTH });
      doc.moveDown(0.35);
    }

    if (report.anomalies.length > 0) {
      drawSectionTitle(doc, 'Anomaly Detail - Flagged Entries');
      drawSimpleTable(
        doc,
        ['Vendor', 'Date', 'Amount', 'Variance', 'Type'],
        report.anomalies.map((row) => [
          row.vendorName,
          row.transactionDate,
          formatMoney(row.totalAmountAud),
          row.varianceAmountAud === null ? '--' : formatMoney(row.varianceAmountAud),
          row.reason === 'variance_flagged' ? 'Variance' : 'Price Spike',
        ]),
        [CONTENT_WIDTH * 0.28, CONTENT_WIDTH * 0.16, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.16],
      );
    }

    // Render footers after all content pages are buffered to avoid mutating
    // layout cursor during page creation (prevents recursive addPage flows).
    const pages = doc.bufferedPageRange();
    for (let pageIndex = pages.start; pageIndex < pages.start + pages.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      drawFooter(doc);
    }

    doc.end();
  });
}
