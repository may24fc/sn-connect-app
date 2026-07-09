import { formatCurrency } from '@/lib/fx/rates';

export const REVENUE_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type ForecastScenarioKey = 'conservative' | 'average' | 'underlying';

export interface RevenueEntryLike {
  id: string;
  year: number;
  month: number;
  actualRevenueAud: number;
}

export interface RevenueGoalLike {
  id: string;
  year: number;
  goalAmountAud: number;
  label: string | null;
  sortOrder: number;
}

export interface ForecastMonthRow {
  month: number;
  monthLabel: string;
  previousYearActual: number | null;
  targetYearValue: number | null;
  targetYearActual: number | null;
  targetYearProjected: number | null;
  isActual: boolean;
  growthPercent: number | null;
  recordTag: 'monthly' | 'all-time' | null;
}

export interface ForecastRecordBanner {
  month: number;
  monthLabel: string;
  amountAud: number;
  tag: 'monthly' | 'all-time';
  title: string;
  description: string;
  relevanceScore: number;
}

export interface ForecastComputation {
  targetYear: number;
  previousYear: number;
  scenarioRates: Record<ForecastScenarioKey, number>;
  appliedScenario: ForecastScenarioKey;
  appliedGrowthPercent: number;
  rows: Array<ForecastMonthRow>;
  earnedJanToDateAud: number;
  projectedTotalAud: number;
  remainingProjectedAud: number;
  sameMonthComparisonPercent: number | null;
  records: Array<ForecastRecordBanner>;
}

interface GoalProgressRow {
  id: string;
  label: string;
  goalAmountAud: number;
  progressPercent: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function mean(values: Array<number>): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getMonthMax(entries: Array<RevenueEntryLike>, month: number): number | null {
  const values = entries
    .filter((entry) => entry.month === month)
    .map((entry) => entry.actualRevenueAud);
  if (values.length === 0) {
    return null;
  }

  return Math.max(...values);
}

function getAllTimeMax(entries: Array<RevenueEntryLike>): number | null {
  if (entries.length === 0) {
    return null;
  }

  return Math.max(...entries.map((entry) => entry.actualRevenueAud));
}

function formatCurrencyNoCents(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
}

function isBeforeMonth(
  left: { year: number; month: number },
  right: { year: number; month: number }
): boolean {
  return left.year < right.year || (left.year === right.year && left.month < right.month);
}

function getFirstEverThresholdCross(
  entries: Array<RevenueEntryLike>,
  year: number,
  month: number,
  amountAud: number
): number | null {
  const milestoneThresholds = [500000, 400000, 300000, 250000, 200000, 150000, 100000];

  for (const threshold of milestoneThresholds) {
    if (amountAud < threshold) {
      continue;
    }

    const reachedBefore = entries.some(
      (entry) =>
        isBeforeMonth({ year: entry.year, month: entry.month }, { year, month }) &&
        entry.actualRevenueAud >= threshold
    );

    if (!reachedBefore) {
      return threshold;
    }
  }

  return null;
}

export function computeRevenueForecast(
  entries: Array<RevenueEntryLike>,
  targetYear: number,
  scenario: ForecastScenarioKey
): ForecastComputation {
  const previousYear = targetYear - 1;
  const entryByYearMonth = new Map<string, RevenueEntryLike>();

  for (const entry of entries) {
    entryByYearMonth.set(`${entry.year}-${entry.month}`, entry);
  }

  const allTimeMax = getAllTimeMax(entries);

  const actualGrowthSignals = REVENUE_MONTHS.map((_, index) => {
    const month = index + 1;
    const current = entryByYearMonth.get(`${targetYear}-${month}`);
    const previous = entryByYearMonth.get(`${previousYear}-${month}`);

    if (!(current && previous) || previous.actualRevenueAud <= 0) {
      return null;
    }

    const growth =
      ((current.actualRevenueAud - previous.actualRevenueAud) / previous.actualRevenueAud) * 100;
    const monthMax = getMonthMax(entries, month);
    const isMonthlyRecord = monthMax !== null && current.actualRevenueAud >= monthMax;
    const isAllTimeRecord = allTimeMax !== null && current.actualRevenueAud >= allTimeMax;

    return {
      month,
      growth,
      isRecord: isMonthlyRecord || isAllTimeRecord,
    };
  }).filter((value): value is { month: number; growth: number; isRecord: boolean } =>
    Boolean(value)
  );

  const growthValues = actualGrowthSignals.map((signal) => signal.growth);
  const nonRecordGrowthValues = actualGrowthSignals
    .filter((signal) => !signal.isRecord)
    .map((signal) => signal.growth);

  const conservative = growthValues.length > 0 ? Math.min(...growthValues) : 0;
  const average = mean(growthValues);
  const underlying = nonRecordGrowthValues.length > 0 ? mean(nonRecordGrowthValues) : average;

  const scenarioRates: Record<ForecastScenarioKey, number> = {
    conservative: round2(conservative),
    average: round2(average),
    underlying: round2(underlying),
  };

  const appliedGrowthPercent = scenarioRates[scenario];

  const rows: Array<ForecastMonthRow> = REVENUE_MONTHS.map((label, index) => {
    const month = index + 1;
    const previous = entryByYearMonth.get(`${previousYear}-${month}`);
    const current = entryByYearMonth.get(`${targetYear}-${month}`);

    const previousYearActual = previous?.actualRevenueAud ?? null;
    const targetYearActual = current?.actualRevenueAud ?? null;

    const targetYearProjected =
      targetYearActual === null && previousYearActual !== null
        ? round2(previousYearActual * (1 + appliedGrowthPercent / 100))
        : null;

    const targetYearValue = targetYearActual ?? targetYearProjected;

    const growthPercent =
      targetYearValue !== null && previousYearActual !== null && previousYearActual > 0
        ? round2(((targetYearValue - previousYearActual) / previousYearActual) * 100)
        : null;

    let recordTag: 'monthly' | 'all-time' | null = null;

    if (targetYearActual !== null) {
      const monthMax = getMonthMax(entries, month);
      const isMonthlyRecord = monthMax !== null && targetYearActual >= monthMax;
      const isAllTimeRecord = allTimeMax !== null && targetYearActual >= allTimeMax;

      if (isAllTimeRecord) {
        recordTag = 'all-time';
      } else if (isMonthlyRecord) {
        recordTag = 'monthly';
      }
    }

    return {
      month,
      monthLabel: label,
      previousYearActual,
      targetYearValue,
      targetYearActual,
      targetYearProjected,
      isActual: targetYearActual !== null,
      growthPercent,
      recordTag,
    };
  });

  const earnedJanToDateAud = round2(
    rows
      .filter((row) => row.isActual && row.targetYearActual !== null)
      .reduce((sum, row) => sum + (row.targetYearActual ?? 0), 0)
  );

  const projectedTotalAud = round2(rows.reduce((sum, row) => sum + (row.targetYearValue ?? 0), 0));
  const remainingProjectedAud = round2(Math.max(projectedTotalAud - earnedJanToDateAud, 0));

  const previousComparableTotal = rows.reduce((sum, row) => sum + (row.previousYearActual ?? 0), 0);
  const sameMonthComparisonPercent =
    previousComparableTotal > 0
      ? round2(((projectedTotalAud - previousComparableTotal) / previousComparableTotal) * 100)
      : null;

  const records: Array<ForecastRecordBanner> = rows
    .filter((row) => row.recordTag !== null && row.targetYearActual !== null)
    .map((row) => {
      const amountAud = row.targetYearActual ?? 0;
      const firstThreshold = getFirstEverThresholdCross(entries, targetYear, row.month, amountAud);

      if (row.recordTag === 'all-time') {
        const thresholdDescription =
          firstThreshold !== null
            ? `First ever month to break ${formatCurrencyNoCents(firstThreshold)} in SFO history`
            : 'New all-time monthly revenue in SFO history';

        return {
          month: row.month,
          monthLabel: row.monthLabel,
          amountAud,
          tag: 'all-time' as const,
          title: `${row.monthLabel} ${targetYear} - ${formatCurrencyNoCents(amountAud)}`,
          description: thresholdDescription,
          relevanceScore: 1000 + (firstThreshold ?? 0) + amountAud / 1000,
        };
      }

      const monthHistoryMax = entries
        .filter((entry) => entry.month === row.month && entry.year < targetYear)
        .reduce<number | null>(
          (max, entry) => (max === null ? entry.actualRevenueAud : Math.max(max, entry.actualRevenueAud)),
          null
        );

      const upliftPercent =
        monthHistoryMax !== null && monthHistoryMax > 0
          ? round2(((amountAud - monthHistoryMax) / monthHistoryMax) * 100)
          : null;

      return {
        month: row.month,
        monthLabel: row.monthLabel,
        amountAud,
        tag: 'monthly' as const,
        title: `${row.monthLabel} ${targetYear} - ${formatCurrencyNoCents(amountAud)}`,
        description:
          upliftPercent !== null && upliftPercent > 0
            ? `All-time record for any ${row.monthLabel} in SFO history (+${upliftPercent.toFixed(1)}%)`
            : `All-time record for any ${row.monthLabel} in SFO history`,
        relevanceScore: 700 + (upliftPercent ?? 0) + amountAud / 10000,
      };
    })
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }

      return right.month - left.month;
    });

  return {
    targetYear,
    previousYear,
    scenarioRates,
    appliedScenario: scenario,
    appliedGrowthPercent,
    rows,
    earnedJanToDateAud,
    projectedTotalAud,
    remainingProjectedAud,
    sameMonthComparisonPercent,
    records,
  };
}

export function buildGoalProgressRows(
  goals: Array<RevenueGoalLike>,
  year: number,
  projectedTotalAud: number
): Array<GoalProgressRow> {
  return goals
    .filter((goal) => goal.year === year)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((goal) => ({
      id: goal.id,
      label: goal.label?.trim() || `${formatCurrency(goal.goalAmountAud, 'AUD')} goal`,
      goalAmountAud: goal.goalAmountAud,
      progressPercent:
        goal.goalAmountAud > 0
          ? Math.min(round2((projectedTotalAud / goal.goalAmountAud) * 100), 100)
          : 0,
    }));
}
