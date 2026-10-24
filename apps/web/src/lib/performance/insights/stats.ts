import {
  FIVE_PERCENT_AREAS,
  type FivePercentArea,
  type InsightReflection,
  type InsightSource,
} from './source';

/** Ranks at or below this count as "low" in monthly aggregates. */
export const LOW_RANK_THRESHOLD = 4;
/** A single rank at or below this is flagged per person. */
export const CRITICAL_RANK_THRESHOLD = 3;
/** A month-over-month drop of at least this many points is flagged. */
export const RANK_DROP_THRESHOLD = 3;

export type RankAggregate = {
  average: number | null;
  median: number | null;
  lowCount: number;
};

export type MonthStats = {
  monthKey: string;
  submittedCount: number;
  expectedCount: number;
  submissionRate: number | null;
  areas: Record<FivePercentArea, RankAggregate>;
  overall: RankAggregate;
};

export type PersonRanks = Record<FivePercentArea, number | null> & { average: number | null };

export type PersonTrend = {
  personLabel: string;
  department: string;
  /** Aligned with `InsightSource.windowMonths`; null when not submitted. */
  ranks: Array<PersonRanks | null>;
  /** Selected month minus the person's most recent earlier submission. */
  delta: PersonRanks | null;
  flags: Array<string>;
};

export type InsightStats = {
  months: Array<MonthStats>;
  people: Array<PersonTrend>;
  submittedLabels: Array<string>;
  pendingLabels: Array<string>;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function aggregate(values: Array<number>): RankAggregate {
  if (values.length === 0) {
    return { average: null, median: null, lowCount: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
      : (sorted[middle] as number);

  return {
    average: round1(values.reduce((sum, value) => sum + value, 0) / values.length),
    median: round1(median),
    lowCount: values.filter((value) => value <= LOW_RANK_THRESHOLD).length,
  };
}

export function personRanks(reflection: InsightReflection): PersonRanks {
  const ranks = FIVE_PERCENT_AREAS.map((area) => reflection.areas[area].rank);
  const present = ranks.filter((rank): rank is number => rank !== null);

  return {
    work: reflection.areas.work.rank,
    family: reflection.areas.family.rank,
    personal: reflection.areas.personal.rank,
    average:
      present.length > 0
        ? round1(present.reduce((sum, rank) => sum + rank, 0) / present.length)
        : null,
  };
}

function diff(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : round1(current - previous);
}

function buildMonthStats(
  monthKey: string,
  reflections: Array<InsightReflection>,
  expectedCount: number
): MonthStats {
  const ranks = reflections.map(personRanks);
  const areas = Object.fromEntries(
    FIVE_PERCENT_AREAS.map((area) => [
      area,
      aggregate(ranks.map((rank) => rank[area]).filter((rank): rank is number => rank !== null)),
    ])
  ) as Record<FivePercentArea, RankAggregate>;

  return {
    monthKey,
    submittedCount: reflections.length,
    expectedCount,
    submissionRate:
      expectedCount > 0 ? Math.round((reflections.length / expectedCount) * 100) : null,
    areas,
    overall: aggregate(
      ranks.map((rank) => rank.average).filter((rank): rank is number => rank !== null)
    ),
  };
}

function buildFlags(trend: Omit<PersonTrend, 'flags'>, isExpected: boolean): Array<string> {
  const flags: Array<string> = [];
  const current = trend.ranks[0];

  if (current) {
    for (const area of FIVE_PERCENT_AREAS) {
      const rank = current[area];
      if (rank !== null && rank <= CRITICAL_RANK_THRESHOLD) {
        flags.push(`${area} rank ${rank}`);
      }
      const change = trend.delta?.[area] ?? null;
      if (change !== null && change <= -RANK_DROP_THRESHOLD) {
        flags.push(`${area} dropped ${Math.abs(change)}`);
      }
    }
  }

  if (isExpected && trend.ranks.length >= 2 && !trend.ranks[0] && !trend.ranks[1]) {
    flags.push('missed 2 consecutive months');
  }

  return flags;
}

/** Deterministic statistics for the prompt; the model is told never to recompute these. */
export function buildInsightStats(source: InsightSource): InsightStats {
  const expectedIds = new Set(source.audience.map((member) => member.userId));
  const byMonth = new Map<string, Array<InsightReflection>>();
  const byPerson = new Map<string, Map<string, InsightReflection>>();

  for (const reflection of source.reflections) {
    byMonth.set(reflection.monthKey, [...(byMonth.get(reflection.monthKey) ?? []), reflection]);
    const months = byPerson.get(reflection.userId) ?? new Map<string, InsightReflection>();
    months.set(reflection.monthKey, reflection);
    byPerson.set(reflection.userId, months);
  }

  const months = source.windowMonths.map((monthKey) =>
    buildMonthStats(monthKey, byMonth.get(monthKey) ?? [], expectedIds.size)
  );

  const identities = new Map<string, { personLabel: string; department: string }>();
  for (const member of source.audience) {
    identities.set(member.userId, member);
  }
  for (const reflection of source.reflections) {
    identities.set(reflection.userId, reflection);
  }

  const people: Array<PersonTrend> = [...identities.entries()]
    .map(([userId, identity]) => {
      const submissions = byPerson.get(userId);
      const ranks = source.windowMonths.map((monthKey) => {
        const reflection = submissions?.get(monthKey);
        return reflection ? personRanks(reflection) : null;
      });
      const current = ranks[0] ?? null;
      const previous = ranks.slice(1).find((rank) => rank !== null) ?? null;
      const delta =
        current && previous
          ? {
              work: diff(current.work, previous.work),
              family: diff(current.family, previous.family),
              personal: diff(current.personal, previous.personal),
              average: diff(current.average, previous.average),
            }
          : null;
      const trend = {
        personLabel: identity.personLabel,
        department: identity.department,
        ranks,
        delta,
      };

      return { ...trend, flags: buildFlags(trend, expectedIds.has(userId)) };
    })
    .sort((a, b) => a.personLabel.localeCompare(b.personLabel));

  const submittedIds = new Set(
    (byMonth.get(source.periodKey) ?? []).map((reflection) => reflection.userId)
  );

  return {
    months,
    people,
    submittedLabels: (byMonth.get(source.periodKey) ?? []).map((r) => r.personLabel),
    pendingLabels: source.audience
      .filter((member) => !submittedIds.has(member.userId))
      .map((member) => member.personLabel),
  };
}
