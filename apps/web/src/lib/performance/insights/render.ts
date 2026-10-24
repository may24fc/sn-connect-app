import { createHash } from 'node:crypto';
import { estimateTokenCount } from '@hr-portal/ai';
import { formatPeriodLabel } from '../evaluation-sources';
import { INSIGHT_TOKEN_BUDGET } from './config';
import { FIVE_PERCENT_AREAS, type InsightReflection, type InsightSource } from './source';
import { type InsightStats, type PersonRanks, personRanks } from './stats';

/** Selected-month detail levels: 0 = full text, 3 = shortest. */
export type TruncationLevel = 0 | 1 | 2 | 3;
/** Prior-month condensation: P0 feelings+headlines+ranks, P1 latest headlines, P2 ranks only. */
export type PriorMode = 'P0' | 'P1' | 'P2';

export type InsightContextMeta = {
  periodKey: string;
  monthsIncluded: Array<string>;
  submittedCount: number;
  pendingCount: number;
  truncationLevel: TruncationLevel;
  priorMode: PriorMode;
};

export type RenderedInsightContext = {
  text: string;
  tokenEstimate: number;
  snapshotHash: string;
  meta: InsightContextMeta;
};

type TextLimits = { detail: number; notes: number; dropAction: boolean };

const TRUNCATION_LIMITS: Record<TruncationLevel, TextLimits> = {
  0: { detail: Number.POSITIVE_INFINITY, notes: Number.POSITIVE_INFINITY, dropAction: false },
  1: { detail: 800, notes: 1000, dropAction: false },
  2: { detail: 400, notes: 500, dropAction: false },
  3: { detail: 400, notes: 500, dropAction: true },
};

const PRIOR_FEELINGS_CHARS = 200;
const PRIOR_HEADLINE_CHARS = 160;

/**
 * Employee-written text is data, not markup: angle brackets are swapped for
 * look-alikes so a reflection cannot close its tag or open a fake one.
 */
export function escapeData(value: string): string {
  return value
    .replace(/</g, '‹')
    .replace(/>/g, '›')
    .replace(/\s*\n+\s*/g, ' / ')
    .trim();
}

function escapeAttribute(value: string): string {
  return escapeData(value).replace(/"/g, "'");
}

function clip(value: string, max: number): string {
  const text = escapeData(value);
  if (!text) return '—';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function monthLabel(monthKey: string): string {
  return formatPeriodLabel('five_percent', monthKey);
}

function formatNumber(value: number | null): string {
  return value === null ? '—' : String(value);
}

function formatDelta(value: number | null): string {
  if (value === null) return '—';
  return value > 0 ? `+${value}` : String(value);
}

function formatRanks(ranks: PersonRanks | null): string {
  if (!ranks) return '—';
  return `${formatNumber(ranks.work)}/${formatNumber(ranks.family)}/${formatNumber(ranks.personal)}`;
}

function renderStats(source: InsightSource, stats: InsightStats): string {
  const [selected, ...prior] = source.windowMonths;
  const lines = [
    '<stats>',
    `Window: ${monthLabel(selected as string)} (selected)${
      prior.length > 0 ? ` + ${prior.map(monthLabel).join(', ')} (prior)` : ''
    }.`,
    'Monthly aggregates. Ranks are 1-10; "low" counts ranks of 4 or less. Format avg/median/low.',
    '| Month | Submitted | Expected | Rate | Work | Family | Personal | Overall avg |',
    '| --- | ---: | ---: | ---: | --- | --- | --- | ---: |',
    ...stats.months.map((month) => {
      const area = (key: 'work' | 'family' | 'personal') =>
        `${formatNumber(month.areas[key].average)}/${formatNumber(month.areas[key].median)}/${month.areas[key].lowCount}`;
      return `| ${monthLabel(month.monthKey)} | ${month.submittedCount} | ${month.expectedCount} | ${
        month.submissionRate === null ? '—' : `${month.submissionRate}%`
      } | ${area('work')} | ${area('family')} | ${area('personal')} | ${formatNumber(month.overall.average)} |`;
    }),
    '',
    'Per-person ranks as work/family/personal ("—" = not submitted). Δ compares the selected month with the person\'s most recent earlier submission in the window.',
    `| Person | Dept | ${source.windowMonths.map(monthLabel).join(' | ')} | Δ work | Δ family | Δ personal | Flags |`,
    `| --- | --- | ${source.windowMonths.map(() => '---').join(' | ')} | ---: | ---: | ---: | --- |`,
    ...stats.people.map(
      (person) =>
        `| ${escapeData(person.personLabel)} | ${escapeData(person.department)} | ${person.ranks
          .map(formatRanks)
          .join(' | ')} | ${formatDelta(person.delta?.work ?? null)} | ${formatDelta(
          person.delta?.family ?? null
        )} | ${formatDelta(person.delta?.personal ?? null)} | ${
          person.flags.length > 0 ? person.flags.join('; ') : '—'
        } |`
    ),
    '</stats>',
    `<roster month="${source.periodKey}">`,
    `Submitted (${stats.submittedLabels.length}): ${
      stats.submittedLabels.map(escapeData).join(', ') || 'none'
    }`,
    `Pending (${stats.pendingLabels.length}): ${stats.pendingLabels.map(escapeData).join(', ') || 'none'}`,
    '</roster>',
  ];

  return lines.join('\n');
}

function renderReflection(reflection: InsightReflection, level: TruncationLevel): string {
  const limits = TRUNCATION_LIMITS[level];
  const ranks = personRanks(reflection);
  const submitted = reflection.submittedAt ? reflection.submittedAt.slice(0, 10) : 'unknown';

  return [
    `<reflection person="${escapeAttribute(reflection.personLabel)}" dept="${escapeAttribute(
      reflection.department
    )}" month="${reflection.monthKey}" submitted="${submitted}">`,
    `Ranks: work ${formatNumber(ranks.work)}, family ${formatNumber(ranks.family)}, personal ${formatNumber(
      ranks.personal
    )} (avg ${formatNumber(ranks.average)})`,
    ...FIVE_PERCENT_AREAS.map((area) => {
      const answer = reflection.areas[area];
      const parts = [
        `feelings: ${clip(answer.feelings, limits.detail)}`,
        `headline: ${clip(answer.headline, limits.detail)}`,
        `significance: ${clip(answer.significance, limits.detail)}`,
        ...(limits.dropAction ? [] : [`action: ${clip(answer.action, limits.detail)}`]),
      ];
      return `${area.toUpperCase()} — ${parts.join(' | ')}`;
    }),
    `Deep-dive parking lot: ${clip(reflection.parkingLot, limits.notes)}`,
    `Topics to explore: ${clip(reflection.exploration, limits.notes)}`,
    '</reflection>',
  ].join('\n');
}

function renderPriorLine(reflection: InsightReflection, detail: 'full' | 'headlines' | 'ranks') {
  const head = `${escapeData(reflection.personLabel)} | ranks ${formatRanks(personRanks(reflection))}`;
  if (detail === 'ranks') return head;

  const headlines = FIVE_PERCENT_AREAS.map(
    (area) =>
      `${area[0]?.toUpperCase()}: ${clip(reflection.areas[area].headline, PRIOR_HEADLINE_CHARS)}`
  ).join('; ');
  if (detail === 'headlines') return `${head} | headlines ${headlines}`;

  const feelings = FIVE_PERCENT_AREAS.map(
    (area) =>
      `${area[0]?.toUpperCase()}: ${clip(reflection.areas[area].feelings, PRIOR_FEELINGS_CHARS)}`
  ).join('; ');
  return `${head} | headlines ${headlines} | feelings ${feelings}`;
}

export function renderPriorMonths(source: InsightSource, mode: PriorMode): string {
  const prior = source.windowMonths.slice(1);

  return prior
    .map((monthKey, index) => {
      const detail = mode === 'P0' ? 'full' : mode === 'P1' && index === 0 ? 'headlines' : 'ranks';
      const lines = source.reflections
        .filter((reflection) => reflection.monthKey === monthKey)
        .map((reflection) => renderPriorLine(reflection, detail));

      return [
        `<prior month="${monthKey}" detail="${detail}">`,
        ...(lines.length > 0 ? lines : ['No submissions.']),
        '</prior>',
      ].join('\n');
    })
    .join('\n');
}

export function buildSnapshotHash(source: InsightSource): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        windowMonths: source.windowMonths,
        audience: source.audience.map((member) => member.personLabel),
        reflections: source.reflections,
      })
    )
    .digest('hex');
}

/**
 * Renders the data block for the system prompt, shortening long text step by
 * step (never dropping a person) until each block fits its token budget.
 */
export function renderInsightContext(
  source: InsightSource,
  stats: InsightStats,
  budget: { selectedMonth: number; priorMonths: number } = INSIGHT_TOKEN_BUDGET
): RenderedInsightContext {
  const selected = source.reflections.filter(
    (reflection) => reflection.monthKey === source.periodKey
  );

  let truncationLevel: TruncationLevel = 0;
  let selectedText = '';
  for (const level of [0, 1, 2, 3] as const) {
    truncationLevel = level;
    selectedText = selected.map((reflection) => renderReflection(reflection, level)).join('\n');
    if (estimateTokenCount(selectedText) <= budget.selectedMonth) break;
  }

  let priorMode: PriorMode = 'P0';
  let priorText = '';
  for (const mode of ['P0', 'P1', 'P2'] as const) {
    priorMode = mode;
    priorText = renderPriorMonths(source, mode);
    if (estimateTokenCount(priorText) <= budget.priorMonths) break;
  }

  const text = [
    renderStats(source, stats),
    selectedText || `<reflection month="${source.periodKey}">No submissions.</reflection>`,
    priorText,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    text,
    tokenEstimate: estimateTokenCount(text),
    snapshotHash: buildSnapshotHash(source),
    meta: {
      periodKey: source.periodKey,
      monthsIncluded: source.windowMonths,
      submittedCount: stats.submittedLabels.length,
      pendingCount: stats.pendingLabels.length,
      truncationLevel,
      priorMode,
    },
  };
}
