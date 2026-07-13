const fs = require('fs');

// Read the file and keep only lines 1-91 (0-indexed: 0-90) — the clean design tokens and helper functions
const lines = fs.readFileSync('apps/web/src/lib/expenses/monthly-report-pdf.ts', 'utf8').split('\n');
const cleanTop = lines.slice(0, 91).join('\n');

// Write back: cleanTop + new functions
const newContent = cleanTop + `
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

  fill(doc, C.muted).font('Helvetica-Bold').fontSize(8)
    .text('PREVIOUS MONTH', leftX, colLabelY, { width: colW, align: 'center', characterSpacing: 0.6 });
  fill(doc, C.navy).font('Helvetica-Bold').fontSize(8)
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

      fill(doc, C.muted).font('Helvetica').fontSize(7)
        .text(item.metric.toUpperCase(), cardX + 12, cardY + 10, {
          width: colW - 24,
          characterSpacing: 0.4,
        });

      if (isSpend) {
        fill(doc, C.muted).font('Helvetica').fontSize(8)
          .text('AUD ', cardX + 12, cardY + 26, { continued: true });
        fill(doc, isCurrent ? C.navy : C.slate).font('Helvetica-Bold').fontSize(16)
          .text(formatMoneyShort(value), { continued: false });
      } else {
        fill(doc, isCurrent ? C.navy : C.slate).font('Helvetica-Bold').fontSize(16)
          .text(String(value), cardX + 12, cardY + 26);
      }

      if (isCurrent) {
        const momVal = item.momPercentChange;
        const momLabel = formatPercent(momVal);
        const momC = momColor(momVal);
        const badgeW = 48;
        const badgeX = cardX + colW - badgeW - 10;
        const badgeBg = momC === C.rose ? '#FFF1F2' : momC === C.emerald ? '#ECFDF5' : C.divider;
        doc.roundedRect(badgeX, cardY + cardH - 20, badgeW, 13, 3)
          .fillColor(badgeBg).fill();
        fill(doc, momC).font('Helvetica-Bold').fontSize(7.5)
          .text(momLabel, badgeX, cardY + cardH - 18, { width: badgeW, align: 'center' });
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
    // SECTION 2 - Spend Distribution: Category + Department side by side
    // -----------------------------------------------------------------------
    sectionHeading(doc, 'Spend Distribution');

    const colW = (CONTENT_WIDTH - 20) / 2;
    const leftX = M;
    const rightX = M + colW + 20;

    const catRows = report.categoryBreakdown.map((r) => [
      formatCategoryLabel(r.category),
      formatMoney(r.spendAud),
      r.percentOfTotal.toFixed(1) + '%',
    ]);

    const deptRows = report.departmentBreakdown.map((r) => [
      r.departmentName,
      formatMoney(r.spendAud),
      formatPercent(r.momVariationPercent),
    ]);

    const twoColStartY = doc.y;

    fill(doc, C.navy).font('Helvetica-Bold').fontSize(8.5)
      .text('By Expense Category', leftX, twoColStartY);
    fill(doc, C.navy).font('Helvetica-Bold').fontSize(8.5)
      .text('Top Operational Units', rightX, twoColStartY);

    const twoColDataY = twoColStartY + 18;

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

    doc.y = Math.max(leftEnd, rightEnd) + 12;

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
`;

fs.writeFileSync('apps/web/src/lib/expenses/monthly-report-pdf.ts', newContent, 'utf8');
console.log('Written. Lines:', newContent.split('\n').length);
