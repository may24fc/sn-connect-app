import PDFDocument from 'pdfkit';
import {
  type FivePercentReflectionRecord,
  fivePercentReflectionDetailSections,
  getFivePercentAverageRank,
} from '@/components/performance/fivePercentReflectionDetailConfig';

const MARGIN = 48;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_TEXT = 'Control Hub | Confidential';
const FOOTER_SPACE = 20;

const COLORS = {
  ink: '#193154',
  text: '#334155',
  muted: '#6B7C93',
  divider: '#E7EDF5',
} as const;

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-AU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number): void {
  if (doc.y + neededHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

export function getFivePercentReflectionPdfFileName(monthKey: string): string {
  return `5-percent-reflection-${monthKey}.pdf`;
}

export async function renderFivePercentReflectionPdf(
  record: FivePercentReflectionRecord
): Promise<Buffer> {
  const monthLabel = formatMonthLabel(record.month_key);

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, left: MARGIN, right: MARGIN, bottom: MARGIN + FOOTER_SPACE },
      bufferPages: true,
      info: {
        Title: `5% Reflection - ${monthLabel}`,
        Author: 'Control Hub',
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', (error) => reject(error));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.ink).text(`5% Reflection - ${monthLabel}`);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text).text(record.full_name);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(record.department_role);
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text(
        `Submitted ${new Date(record.submitted_at).toLocaleString('en-AU', { dateStyle: 'long', timeStyle: 'short' })} | Average rank ${getFivePercentAverageRank(record)} / 10`
      );
    doc.moveDown(1);

    for (const section of fivePercentReflectionDetailSections) {
      ensureSpace(doc, 80);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.ink).text(section.title, MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      });
      const lineY = doc.y + 4;
      doc
        .moveTo(MARGIN, lineY)
        .lineTo(MARGIN + CONTENT_WIDTH, lineY)
        .lineWidth(1)
        .strokeColor(COLORS.divider)
        .stroke();
      doc.y = lineY + 10;

      for (const field of section.fields) {
        ensureSpace(doc, 48);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted).text(field.label, MARGIN, doc.y, {
          width: CONTENT_WIDTH,
        });
        doc.moveDown(0.2);
        const value = field.value(record).trim() || '—';
        doc
          .font(field.emphasizeValue ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(field.emphasizeValue ? 12 : 10)
          .fillColor(COLORS.text)
          .text(value, MARGIN, doc.y, { width: CONTENT_WIDTH });
        doc.moveDown(0.8);
      }

      doc.moveDown(0.6);
    }

    const pages = doc.bufferedPageRange();
    for (let pageIndex = pages.start; pageIndex < pages.start + pages.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      // Drop the bottom margin so writing in the footer band doesn't auto-add a page.
      doc.page.margins.bottom = 0;
      const footerY = doc.page.height - MARGIN;
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#94A3B8')
        .text(`${FOOTER_TEXT} | Page ${pageIndex + 1} of ${pages.count}`, MARGIN, footerY, {
          width: CONTENT_WIDTH,
          align: 'center',
          lineBreak: false,
        });
    }

    doc.end();
  });
}
