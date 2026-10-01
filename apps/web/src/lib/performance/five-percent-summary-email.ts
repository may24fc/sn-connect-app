export type FivePercentSummaryEmailTrigger = 'all_submitted' | 'deadline' | 'manual';

export interface FivePercentSummaryEmailInput {
  monthKey: string;
  trigger: FivePercentSummaryEmailTrigger;
  summaryMarkdown: string;
  submittedCount: number;
  expectedCount: number;
  /** Display names of expected members who have not submitted. */
  pendingNames: Array<string>;
  dueDateLabel: string;
  generatedAt: string;
  reviewUrl: string;
}

const TEXT_STYLE = 'margin:0 0 12px;color:#3f3f46;font-size:14px;line-height:1.6;';
const LIST_STYLE =
  'margin:0 0 12px;padding-left:20px;color:#3f3f46;font-size:14px;line-height:1.6;';
const HEADING_STYLES: Record<2 | 3 | 4, string> = {
  2: 'margin:0 0 16px;color:#18181b;font-size:18px;font-weight:700;',
  3: 'margin:24px 0 10px;color:#175063;font-size:16px;font-weight:700;border-bottom:1px solid #e4e4e7;padding-bottom:6px;',
  4: 'margin:16px 0 8px;color:#18181b;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;',
};

export function escapeEmailHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  return escapeEmailHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(
      /`([^`]+)`/g,
      '<code style="background:#f4f4f5;border-radius:4px;padding:1px 4px;">$1</code>'
    );
}

/**
 * Converts the summary markdown produced by the evaluation summary engine into
 * email-safe HTML with inline styles. Supports the subset the engine emits:
 * `##`–`####` headings, bullet/numbered lists, blockquotes, bold/italic and paragraphs.
 */
export function renderSummaryMarkdownToEmailHtml(markdown: string): string {
  const output: Array<string> = [];
  let openList: 'ul' | 'ol' | null = null;
  let paragraph: Array<string> = [];

  const closeList = (): void => {
    if (openList) {
      output.push(`</${openList}>`);
      openList = null;
    }
  };

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      output.push(`<p style="${TEXT_STYLE}">${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };

  for (const rawLine of markdown.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = Math.min(Math.max(heading[1]?.length ?? 2, 2), 4) as 2 | 3 | 4;
      output.push(
        `<h${level} style="${HEADING_STYLES[level]}">${renderInline(heading[2] ?? '')}</h${level}>`
      );
      continue;
    }

    const bullet = line.match(/^[*-]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const listType = bullet ? 'ul' : 'ol';
      if (openList !== listType) {
        closeList();
        output.push(`<${listType} style="${LIST_STYLE}">`);
        openList = listType;
      }
      output.push(
        `<li style="margin:0 0 6px;">${renderInline((bullet ?? numbered)?.[1] ?? '')}</li>`
      );
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      output.push(
        `<blockquote style="margin:0 0 12px;padding:10px 14px;border-left:3px solid #175063;background:#f0f7f9;color:#3f3f46;font-size:14px;line-height:1.6;">${renderInline(quote[1] ?? '')}</blockquote>`
      );
      continue;
    }

    closeList();
    paragraph.push(line);
  }

  flushParagraph();
  closeList();

  return output.join('\n');
}

export function formatMonthKeyLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!(year && month)) {
    return monthKey;
  }

  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatGeneratedAt(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
    timeZoneName: 'short',
  });
}

function buildIntroHtml(input: FivePercentSummaryEmailInput, monthLabel: string): string {
  const safeMonth = escapeEmailHtml(monthLabel);
  const everyoneSubmitted = input.pendingNames.length === 0;

  if (input.trigger === 'all_submitted') {
    return `<p style="${TEXT_STYLE}">All <strong>${input.expectedCount}</strong> expected team members have submitted their 5% Reflection for <strong>${safeMonth}</strong>. The AI summary of every submission is below.</p>`;
  }

  const counts = everyoneSubmitted
    ? `All <strong>${input.expectedCount}</strong> expected team members submitted`
    : `<strong>${input.submittedCount} of ${input.expectedCount}</strong> expected team members submitted`;

  const intro =
    input.trigger === 'manual'
      ? `<p style="${TEXT_STYLE}">This ${safeMonth} 5% Reflection summary was sent manually from Control Hub. ${counts}, and the AI summary below covers those submissions.</p>`
      : `<p style="${TEXT_STYLE}">The ${safeMonth} 5% Reflection deadline (<strong>${escapeEmailHtml(input.dueDateLabel)}</strong>) has been reached. ${counts}, and the AI summary below covers those submissions.</p>`;

  if (everyoneSubmitted) {
    return intro;
  }

  return `${intro}
<div style="margin:0 0 16px;padding:12px 14px;border:1px solid #fde68a;background:#fffbeb;border-radius:10px;">
  <p style="margin:0 0 6px;color:#92400e;font-size:13px;font-weight:700;">Not yet submitted (${input.pendingNames.length})</p>
  <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">${input.pendingNames.map(escapeEmailHtml).join(', ')}</p>
</div>`;
}

export function buildFivePercentSummaryEmail(input: FivePercentSummaryEmailInput): {
  subject: string;
  html: string;
} {
  const monthLabel = formatMonthKeyLabel(input.monthKey);
  const subject =
    input.pendingNames.length === 0
      ? `5% Reflection Summary: ${monthLabel} (all ${input.expectedCount} submitted)`
      : `5% Reflection Summary: ${monthLabel} (${input.submittedCount} of ${input.expectedCount} submitted)`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${escapeEmailHtml(subject)}</title></head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f4f4f5;">
  <div style="max-width:640px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0F172A;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Control Hub HR Portal</h1>
    </div>
    <div style="padding:32px 24px;">
      <p style="margin:0 0 4px;color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;">5% Reflection · ${escapeEmailHtml(monthLabel)}</p>
      <h2 style="margin:0 0 16px;color:#18181b;font-size:20px;font-weight:700;">Monthly AI Summary</h2>
      ${buildIntroHtml(input, monthLabel)}
      <div style="margin:20px 0 0;padding:20px;border:1px solid #e4e4e7;border-radius:12px;background:#fcfcfd;">
${renderSummaryMarkdownToEmailHtml(input.summaryMarkdown)}
      </div>
      <div style="margin:24px 0 0;"><a href="${escapeEmailHtml(input.reviewUrl)}" style="display:inline-block;background:#175063;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600;">Open 5% Reflections in Control Hub</a></div>
      <div style="border-top:1px solid #e4e4e7;padding-top:20px;margin-top:24px;">
        <p style="margin:0;color:#71717a;font-size:12px;line-height:1.5;">
          Summary generated ${escapeEmailHtml(formatGeneratedAt(input.generatedAt))} from anonymized submissions. AI-generated content may contain mistakes, so check individual reflections in Control Hub before acting on them.<br />
          This is an automated message. Please do not reply to this email.<br />
          &copy; ${new Date(input.generatedAt).getUTCFullYear()} SN International Group. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
