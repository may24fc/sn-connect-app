import PDFDocument from 'pdfkit';
import type { MonthlyExpenseReport } from './monthly-report';

const MARGIN = 48;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_TEXT = 'Control Hub | Confidential';

const COLORS = {
  ink: '#193154',
  text: '#334155',
  muted: '#6B7C93',
  border: '#D9E3F0',
  divider: '#E7EDF5',
  cardFill: '#FFFFFF',
  cardFillMuted: '#FAFCFF',
  positive: '#0F766E',
  positiveBg: '#E6FFFB',
  negative: '#E11D48',
  negativeBg: '#FFE8EF',
  neutral: '#64748B',
  neutralBg: '#EEF2F7',
} as const;

const CHART_PALETTE = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#14B8A6', '#F97316'] as const;

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

function momColors(value: number | null): { text: string; background: string } {
  if (value === null || value === 0) {
    return { text: COLORS.neutral, background: COLORS.neutralBg };
  }

  if (value > 0) {
    return { text: COLORS.negative, background: COLORS.negativeBg };
  }

  return { text: COLORS.positive, background: COLORS.positiveBg };
}

function drawMoneyValue(doc: PDFKit.PDFDocument, value: number, x: number, y: number, width: number): void {
  const amountText = value.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const currencyWidth = 28;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.muted).text('AUD', x, y, {
    width,
    align: 'right',
    lineBreak: false,
  });
  doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.ink).text(amountText, x, y + 14, {
    width: width - currencyWidth,
    align: 'right',
    lineBreak: false,
  });
}

function drawMomBadge(doc: PDFKit.PDFDocument, value: number | null, x: number, y: number): void {
  if (value === null) {
    return;
  }

  const badgeWidth = 58;
  const badgeHeight = 18;
  const palette = momColors(value);

  doc.roundedRect(x, y, badgeWidth, badgeHeight, 9).fillColor(palette.background).fill();
  doc.font('Helvetica-Bold').fontSize(9).fillColor(palette.text).text(formatPercent(value), x, y + 5, {
    width: badgeWidth,
    align: 'center',
    lineBreak: false,
  });
}

function drawMetricCard(
  doc: PDFKit.PDFDocument,
  metricLabel: string,
  value: number,
  x: number,
  y: number,
  width: number,
  options?: { momPercentChange?: number | null; fillColor?: string },
): void {
  const height = 84;
  doc.roundedRect(x, y, width, height, 9).fillColor(options?.fillColor ?? COLORS.cardFill).fill();
  doc.roundedRect(x, y, width, height, 9).lineWidth(1).strokeColor(COLORS.border).stroke();

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(metricLabel.toUpperCase(), x + 18, y + 14, {
    width: width - 36,
    lineBreak: false,
  });

  drawMoneyValue(doc, value, x + 18, y + 18, width - 36);

  if (options && 'momPercentChange' in options) {
    drawMomBadge(doc, options.momPercentChange ?? null, x + 18, y + height - 28);
  }
}

function drawSummaryCards(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  const headingY = doc.y;
  ensureSpace(doc, 240);

  doc.rect(MARGIN, headingY + 2, 3, 18).fillColor('#3B82F6').fill();
  doc.font('Helvetica-Bold').fontSize(17).fillColor(COLORS.ink).text('SUMMARY KEY METRICS', MARGIN + 14, headingY, {
    lineBreak: false,
  });

  const gridTop = headingY + 38;
  const columnGap = 26;
  const dividerX = MARGIN + (CONTENT_WIDTH / 2);
  const columnWidth = (CONTENT_WIDTH - columnGap) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + columnWidth + columnGap;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.muted).text('PREVIOUS MONTH', leftX, gridTop, {
    width: columnWidth,
    align: 'center',
    lineBreak: false,
  });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text('CURRENT MONTH', rightX, gridTop, {
    width: columnWidth,
    align: 'center',
    lineBreak: false,
  });

  const cardStartY = gridTop + 24;
  const cardGap = 12;
  const cardHeight = 84;
  const dividerTop = cardStartY - 8;
  const dividerBottom = cardStartY + report.summary.length * cardHeight + (report.summary.length - 1) * cardGap + 8;
  doc.moveTo(dividerX, dividerTop).lineTo(dividerX, dividerBottom).lineWidth(1).strokeColor(COLORS.divider).stroke();

  report.summary.forEach((item, index) => {
    const top = cardStartY + index * (cardHeight + cardGap);
    drawMetricCard(doc, item.metric, item.previousMonth, leftX, top, columnWidth, {
      fillColor: COLORS.cardFillMuted,
    });
    drawMetricCard(doc, item.metric, item.currentMonth, rightX, top, columnWidth, {
      momPercentChange: item.momPercentChange,
      fillColor: COLORS.cardFill,
    });
  });

  doc.y = dividerBottom + 18;
}

type DistributionSlice = {
  label: string;
  amount: number;
  percent: number;
  momPercent?: number | null;
};

function drawSectionBanner(doc: PDFKit.PDFDocument, title: string): number {
  ensureSpace(doc, 32);
  const y = doc.y;
  doc.rect(MARGIN, y + 2, 3, 18).fillColor('#3B82F6').fill();
  doc.font('Helvetica-Bold').fontSize(17).fillColor(COLORS.ink).text(title.toUpperCase(), MARGIN + 14, y, {
    lineBreak: false,
  });
  return y;
}

function drawPieSlice(
  doc: PDFKit.PDFDocument,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  color: string,
): void {
  const pathDoc = doc as PDFKit.PDFDocument & {
    arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number) => PDFKit.PDFDocument;
  };

  doc.save();
  doc.moveTo(centerX, centerY);
  doc.fillColor(color);
  doc.lineTo(centerX + radius * Math.cos(startAngle), centerY + radius * Math.sin(startAngle));
  pathDoc.arc(centerX, centerY, radius, startAngle, endAngle);
  doc.lineTo(centerX, centerY);
  doc.fill();
  doc.restore();
}

function drawPieChart(doc: PDFKit.PDFDocument, slices: DistributionSlice[], x: number, y: number, size: number): void {
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2;

  if (total <= 0) {
    doc.circle(centerX, centerY, radius).fillColor(COLORS.neutralBg).fill();
    return;
  }

  let angle = -Math.PI / 2;
  slices.forEach((slice, index) => {
    const nextAngle = angle + (slice.amount / total) * Math.PI * 2;
    drawPieSlice(doc, centerX, centerY, radius, angle, nextAngle, CHART_PALETTE[index % CHART_PALETTE.length] ?? CHART_PALETTE[0]);
    angle = nextAngle;
  });
}

function drawLegend(doc: PDFKit.PDFDocument, slices: DistributionSlice[], x: number, y: number, width: number): void {
  slices.forEach((slice, index) => {
    const rowY = y + index * 20;
    const color = CHART_PALETTE[index % CHART_PALETTE.length] ?? CHART_PALETTE[0];
    doc.roundedRect(x, rowY + 2, 10, 10, 2).fillColor(color).fill();
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.text).text(slice.label, x + 18, rowY, {
      width: width - 70,
      lineBreak: false,
    });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(`${slice.percent.toFixed(1)}%`, x, rowY, {
      width,
      align: 'right',
      lineBreak: false,
    });
  });
}

function drawColumnTable(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  columnWidth: number,
  headers: string[],
  rows: Array<{ label: string; amount: string; percent?: string | undefined; mom?: string | undefined; momValue?: number | null | undefined }>,
): number {
  const headerHeight = 18;
  const rowHeight = 21;
  const columns = headers[2] === 'MoM'
    ? [columnWidth * 0.46, columnWidth * 0.32, columnWidth * 0.22]
    : [columnWidth * 0.5, columnWidth * 0.32, columnWidth * 0.18];

  let cursorX = x;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted);
  headers.forEach((header, index) => {
    const width = columns[index] ?? 0;
    doc.text(header.toUpperCase(), cursorX, y, {
      width: width - 4,
      align: index === 0 ? 'left' : 'right',
      lineBreak: false,
    });
    cursorX += width;
  });

  let rowY = y + headerHeight;
  doc.moveTo(x, rowY - 2).lineTo(x + columnWidth, rowY - 2).lineWidth(1).strokeColor(COLORS.divider).stroke();

  rows.forEach((row) => {
    cursorX = x;
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(row.label, cursorX, rowY + 4, {
      width: (columns[0] ?? 0) - 4,
      lineBreak: false,
    });
    cursorX += columns[0] ?? 0;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text(row.amount, cursorX, rowY + 4, {
      width: (columns[1] ?? 0) - 4,
      align: 'right',
      lineBreak: false,
    });
    cursorX += columns[1] ?? 0;

    if (headers[2] === 'MoM') {
      const palette = momColors(row.momValue ?? null);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(palette.text).text(row.mom ?? '--', cursorX, rowY + 4, {
        width: (columns[2] ?? 0) - 4,
        align: 'right',
        lineBreak: false,
      });
    } else {
      doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(row.percent ?? '--', cursorX, rowY + 4, {
        width: (columns[2] ?? 0) - 4,
        align: 'right',
        lineBreak: false,
      });
    }

    rowY += rowHeight;
    doc.moveTo(x, rowY - 2).lineTo(x + columnWidth, rowY - 2).lineWidth(0.8).strokeColor(COLORS.divider).stroke();
  });

  return rowY + 4;
}

function drawDistributionColumn(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle: string,
  x: number,
  y: number,
  width: number,
  slices: DistributionSlice[],
  tableHeaders: string[],
): number {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(title === 'CURRENT MONTH' ? COLORS.ink : COLORS.muted).text(title, x, y, {
    width,
    align: 'center',
    lineBreak: false,
  });

  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink).text(subtitle, x, y + 26, {
    width,
    lineBreak: false,
  });

  const chartY = y + 52;
  drawPieChart(doc, slices, x + 8, chartY, 110);
  drawLegend(doc, slices, x + 132, chartY + 2, width - 132);

  const tableRows = slices.map((slice) => ({
    label: slice.label,
    amount: formatMoney(slice.amount),
    percent: `${slice.percent.toFixed(1)}%`,
    mom: slice.momPercent === undefined || slice.momPercent === null ? '--' : formatPercent(slice.momPercent),
    momValue: slice.momPercent,
  }));

  const tableY = chartY + Math.max(124, slices.length * 20 + 8);
  return drawColumnTable(doc, x, tableY, width, tableHeaders, tableRows);
}

function drawDistributionSection(
  doc: PDFKit.PDFDocument,
  sectionTitle: string,
  leftSubtitle: string,
  rightSubtitle: string,
  leftSlices: DistributionSlice[],
  rightSlices: DistributionSlice[],
  tableHeaders: string[],
): void {
  ensureSpace(doc, 340);
  const headingY = drawSectionBanner(doc, sectionTitle);
  const sectionTop = headingY + 34;
  const gap = 28;
  const columnWidth = (CONTENT_WIDTH - gap) / 2;
  const leftX = MARGIN;
  const rightX = leftX + columnWidth + gap;

  const leftBottom = drawDistributionColumn(doc, 'PREVIOUS MONTH', leftSubtitle, leftX, sectionTop, columnWidth, leftSlices, tableHeaders);
  const rightBottom = drawDistributionColumn(doc, 'CURRENT MONTH', rightSubtitle, rightX, sectionTop, columnWidth, rightSlices, tableHeaders);
  const dividerX = leftX + columnWidth + gap / 2;

  doc.moveTo(dividerX, sectionTop + 34).lineTo(dividerX, Math.max(leftBottom, rightBottom)).lineWidth(1).strokeColor(COLORS.divider).stroke();
  doc.y = Math.max(leftBottom, rightBottom) + 18;
}

function buildDepartmentSlices(report: MonthlyExpenseReport): { previous: DistributionSlice[]; current: DistributionSlice[] } {
  const previousTotal = report.previousDepartmentBreakdown.reduce((sum, row) => sum + row.spendAud, 0);
  const currentTotal = report.departmentBreakdown.reduce((sum, row) => sum + row.spendAud, 0);

  return {
    previous: report.previousDepartmentBreakdown.map((row) => ({
      label: row.departmentName,
      amount: row.spendAud,
      percent: previousTotal > 0 ? Number(((row.spendAud / previousTotal) * 100).toFixed(1)) : 0,
    })),
    current: report.departmentBreakdown.map((row) => ({
      label: row.departmentName,
      amount: row.spendAud,
      percent: currentTotal > 0 ? Number(((row.spendAud / currentTotal) * 100).toFixed(1)) : 0,
      momPercent: row.momVariationPercent,
    })),
  };
}

function buildCategorySlices(report: MonthlyExpenseReport): { previous: DistributionSlice[]; current: DistributionSlice[] } {
  return {
    previous: report.previousCategoryBreakdown.map((row) => ({
      label: formatCategoryLabel(row.category),
      amount: row.spendAud,
      percent: row.percentOfTotal,
    })),
    current: report.categoryBreakdown.map((row) => ({
      label: formatCategoryLabel(row.category),
      amount: row.spendAud,
      percent: row.percentOfTotal,
    })),
  };
}

function anomalyBadgePalette(reason: 'variance_flagged' | 'price_spike'): { text: string; background: string; label: string } {
  if (reason === 'variance_flagged') {
    return {
      text: '#B45309',
      background: '#FFF7ED',
      label: 'Variance Flagged',
    };
  }

  return {
    text: '#BE123C',
    background: '#FFF1F2',
    label: 'Price Spike',
  };
}

function drawAnomalyDetailSection(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  if (report.anomalies.length === 0) {
    return;
  }

  ensureSpace(doc, 240);
  const headingY = drawSectionBanner(doc, 'Anomaly Detail');
  const subtitleY = headingY + 28;
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text('Flagged entries requiring finance review', MARGIN, subtitleY, {
    width: CONTENT_WIDTH,
    lineBreak: false,
  });

  const tableTop = subtitleY + 24;
  const columnWidths = [CONTENT_WIDTH * 0.26, CONTENT_WIDTH * 0.14, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.2, CONTENT_WIDTH * 0.2];
  const headers = ['Vendor', 'Date', 'Amount', 'Variance', 'Flag Type'];

  let cursorX = MARGIN;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted);
  headers.forEach((header, index) => {
    const width = columnWidths[index] ?? 0;
    doc.text(header.toUpperCase(), cursorX, tableTop, {
      width: width - 6,
      align: index < 2 ? 'left' : 'right',
      lineBreak: false,
    });
    cursorX += width;
  });

  let rowY = tableTop + 18;
  doc.moveTo(MARGIN, rowY - 2).lineTo(MARGIN + CONTENT_WIDTH, rowY - 2).lineWidth(1).strokeColor(COLORS.divider).stroke();

  report.anomalies.forEach((row) => {
    ensureSpace(doc, 54);

    doc.roundedRect(MARGIN, rowY + 4, CONTENT_WIDTH, 42, 8).fillColor(COLORS.cardFillMuted).fill();
    doc.roundedRect(MARGIN, rowY + 4, CONTENT_WIDTH, 42, 8).lineWidth(1).strokeColor(COLORS.border).stroke();

    cursorX = MARGIN;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text(row.vendorName, cursorX + 12, rowY + 18, {
      width: (columnWidths[0] ?? 0) - 18,
      lineBreak: false,
    });
    cursorX += columnWidths[0] ?? 0;

    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(row.transactionDate, cursorX + 6, rowY + 18, {
      width: (columnWidths[1] ?? 0) - 12,
      lineBreak: false,
    });
    cursorX += columnWidths[1] ?? 0;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink).text(formatMoney(row.totalAmountAud), cursorX, rowY + 18, {
      width: (columnWidths[2] ?? 0) - 12,
      align: 'right',
      lineBreak: false,
    });
    cursorX += columnWidths[2] ?? 0;

    const varianceText = row.varianceAmountAud === null ? '--' : formatMoney(row.varianceAmountAud);
    const varianceColor = row.varianceAmountAud === null ? COLORS.neutral : COLORS.negative;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(varianceColor).text(varianceText, cursorX, rowY + 18, {
      width: (columnWidths[3] ?? 0) - 12,
      align: 'right',
      lineBreak: false,
    });
    cursorX += columnWidths[3] ?? 0;

    const badge = anomalyBadgePalette(row.reason);
    const badgeWidth = (columnWidths[4] ?? 0) - 24;
    const badgeX = cursorX + ((columnWidths[4] ?? 0) - badgeWidth) / 2;
    doc.roundedRect(badgeX, rowY + 15, badgeWidth, 18, 9).fillColor(badge.background).fill();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(badge.text).text(badge.label, badgeX, rowY + 20, {
      width: badgeWidth,
      align: 'center',
      lineBreak: false,
    });

    rowY += 50;
  });

  doc.y = rowY + 4;
}

function collectInsights(report: MonthlyExpenseReport): string[] {
  const lines: string[] = [];

  const topDepartment = report.departmentBreakdown[0];
  const strongestReduction = report.departmentBreakdown
    .filter((item) => item.momVariationPercent !== null && item.momVariationPercent < 0)
    .sort((a, b) => (a.momVariationPercent ?? 0) - (b.momVariationPercent ?? 0))[0];

  const totalItem = report.summary.find((item) => item.metric.toLowerCase().includes('total spend'));
  if (totalItem && totalItem.momPercentChange !== null) {
    const direction = totalItem.momPercentChange > 0 ? 'increased' : 'decreased';
    lines.push(
      `Total spend ${direction} by ${Math.abs(totalItem.momPercentChange).toFixed(1)}% MoM (${formatMoney(totalItem.previousMonth)} -> ${formatMoney(totalItem.currentMonth)}).`,
    );
  }

  if (topDepartment && topDepartment.momVariationPercent !== null) {
    const direction = topDepartment.momVariationPercent > 0 ? 'largest uplift' : 'largest reduction';
    lines.push(
      `${topDepartment.departmentName} had the ${direction} at ${formatPercent(topDepartment.momVariationPercent)} MoM (${formatMoney(topDepartment.spendAud)}).`,
    );
  }

  if (strongestReduction && strongestReduction !== topDepartment) {
    lines.push(
      `${strongestReduction.departmentName} reduced spend by ${Math.abs(strongestReduction.momVariationPercent ?? 0).toFixed(1)}% MoM (${formatMoney(strongestReduction.spendAud)}), indicating improved cost discipline.`,
    );
  }

  const topCategory = report.categoryBreakdown[0];
  if (topCategory) {
    lines.push(
      `${formatCategoryLabel(topCategory.category)} was the largest expense category, representing ${topCategory.percentOfTotal.toFixed(1)}% of total spend (${formatMoney(topCategory.spendAud)}).`,
    );
  }

  if (report.anomalies.length > 0) {
    const varianceCount = report.anomalies.filter((item) => item.reason === 'variance_flagged').length;
    const priceSpikeCount = report.anomalies.filter((item) => item.reason === 'price_spike').length;
    lines.push(
      `${report.anomalies.length} flagged entries detected (${varianceCount} variance discrepancy${varianceCount === 1 ? '' : 'ies'} and ${priceSpikeCount} price spike${priceSpikeCount === 1 ? '' : 's'}) — see Anomaly Detail section below.`,
    );
  } else {
    lines.push('No anomalies were flagged in this reporting window.');
  }

  return lines;
}

function drawInsightsSection(doc: PDFKit.PDFDocument, report: MonthlyExpenseReport): void {
  const insights = collectInsights(report);
  const lineHeight = 30;
  const cardTopPadding = 18;
  const cardBottomPadding = 18;
  const cardHeight = cardTopPadding + cardBottomPadding + insights.length * lineHeight;

  ensureSpace(doc, cardHeight + 56);
  const headingY = drawSectionBanner(doc, 'Key Spending Insights');
  const cardY = headingY + 30;

  doc.roundedRect(MARGIN + 6, cardY, CONTENT_WIDTH - 6, cardHeight, 8).fillColor('#F5F9FF').fill();
  doc.roundedRect(MARGIN + 6, cardY, CONTENT_WIDTH - 6, cardHeight, 8).lineWidth(1).strokeColor('#BFD6FF').stroke();
  doc.rect(MARGIN + 6, cardY, 4, cardHeight).fillColor('#3B82F6').fill();

  insights.forEach((line, index) => {
    const rowY = cardY + cardTopPadding + index * lineHeight;
    doc.circle(MARGIN + 40, rowY + 6, 4).fillColor('#3B82F6').fill();
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(line, MARGIN + 54, rowY - 2, {
      width: CONTENT_WIDTH - 80,
      lineGap: 2,
    });
  });

  doc.y = cardY + cardHeight + 16;
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

    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.ink).text(`Monthly Expense Analytics Report - ${report.reportMonthLabel}`);
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(`Generated ${new Date(report.generatedAt).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' })}`);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(
      `${report.currentRangeStart} to ${report.currentRangeEndInclusive} | Prior: ${report.previousRangeStart} to ${report.previousRangeEndInclusive}`,
    );
    doc.moveDown(0.8);

    drawSummaryCards(doc, report);

    const departmentSlices = buildDepartmentSlices(report);
    drawDistributionSection(
      doc,
      'Spend Distribution',
      'Top Operational Units',
      'Top Operational Units',
      departmentSlices.previous,
      departmentSlices.current,
      ['Department', 'Spend', 'MoM'],
    );

    const categorySlices = buildCategorySlices(report);
    drawDistributionSection(
      doc,
      'Expense Category Breakdown',
      'By Expense Category',
      'By Expense Category',
      categorySlices.previous,
      categorySlices.current,
      ['Category', 'Amount', '%'],
    );

    drawInsightsSection(doc, report);

    drawAnomalyDetailSection(doc, report);

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
