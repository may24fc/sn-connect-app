import { listPerformanceAudience } from '@/app/api/performance/_lib';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUMMARY_SOURCE_CONFIG, stripPotentialPii } from '../evaluation-sources';

export const FIVE_PERCENT_AREAS = ['work', 'family', 'personal'] as const;
export type FivePercentArea = (typeof FIVE_PERCENT_AREAS)[number];

export type InsightAreaAnswer = {
  feelings: string;
  headline: string;
  significance: string;
  action: string;
  rank: number | null;
};

export type InsightReflection = {
  /** Used only to join with the audience; never rendered into the prompt. */
  userId: string;
  /** Raw name, used only to find mentions for pseudonymization; never rendered. */
  fullName: string;
  personLabel: string;
  department: string;
  monthKey: string;
  submittedAt: string | null;
  areas: Record<FivePercentArea, InsightAreaAnswer>;
  parkingLot: string;
  exploration: string;
};

export type InsightAudienceMember = {
  userId: string;
  fullName: string;
  personLabel: string;
  department: string;
};

export type InsightSource = {
  periodKey: string;
  monthsBack: number;
  /** Selected month first, then prior months from most to least recent. */
  windowMonths: Array<string>;
  reflections: Array<InsightReflection>;
  audience: Array<InsightAudienceMember>;
};

/** Returns the `count` month keys before `periodKey`, most recent first. */
export function priorMonthKeys(periodKey: string, count: number): Array<string> {
  const [yearText, monthText] = periodKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const keys: Array<string> = [];

  for (let offset = 1; offset <= count; offset += 1) {
    const index = year * 12 + (month - 1) - offset;
    const keyYear = Math.floor(index / 12);
    const keyMonth = (index % 12) + 1;
    keys.push(`${keyYear}-${String(keyMonth).padStart(2, '0')}`);
  }

  return keys;
}

function readText(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? stripPotentialPii(value) : '';
}

function readRank(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readOptionalString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

type ParsedReflection = Omit<InsightReflection, 'personLabel' | 'department'> & {
  fullName: string;
  department: string | null;
};

export function parseReflectionRow(value: unknown): ParsedReflection | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Record<string, unknown>;
  const userId = readOptionalString(row, 'user_id');
  const monthKey = readOptionalString(row, 'month_key');
  if (!(userId && monthKey)) {
    return null;
  }

  const areas = Object.fromEntries(
    FIVE_PERCENT_AREAS.map((area) => [
      area,
      {
        feelings: readText(row, `${area}_feelings`),
        headline: readText(row, `${area}_headline`),
        significance: readText(row, `${area}_significance`),
        action: readText(row, `${area}_action`),
        rank: readRank(row, `${area}_rank`),
      },
    ])
  ) as Record<FivePercentArea, InsightAreaAnswer>;

  return {
    userId,
    monthKey,
    fullName: readOptionalString(row, 'full_name') ?? 'Unknown teammate',
    department: readOptionalString(row, 'department_role'),
    submittedAt: readOptionalString(row, 'submitted_at'),
    areas,
    parkingLot: readText(row, 'deep_dive_parking_lot'),
    exploration: readText(row, 'exploration_topics'),
  };
}

type PersonIdentity = { fullName: string; department: string };

/**
 * Gives every person a unique display label so the model can cite them
 * unambiguously. Shared names get the department, then a counter.
 */
export function resolvePersonLabels(people: Map<string, PersonIdentity>): Map<string, string> {
  const byName = new Map<string, Array<string>>();
  for (const [userId, person] of people) {
    const ids = byName.get(person.fullName) ?? [];
    ids.push(userId);
    byName.set(person.fullName, ids);
  }

  const labels = new Map<string, string>();
  for (const [fullName, userIds] of byName) {
    if (userIds.length === 1) {
      labels.set(userIds[0] as string, fullName);
      continue;
    }

    const used = new Map<string, number>();
    for (const userId of [...userIds].sort()) {
      const department = people.get(userId)?.department ?? 'Unspecified';
      const base = `${fullName} (${department})`;
      const seen = (used.get(base) ?? 0) + 1;
      used.set(base, seen);
      labels.set(userId, seen === 1 ? base : `${fullName} (${department} ${seen})`);
    }
  }

  return labels;
}

/**
 * Builds the insight source from raw rows. Pure, so the window, identity, and
 * ordering rules are unit-testable without a database.
 */
export function buildInsightSource(input: {
  periodKey: string;
  monthsBack: number;
  rows: Array<unknown>;
  audience: Array<{ userId: string; fullName: string; departmentRole: string }>;
}): InsightSource {
  const windowMonths = [input.periodKey, ...priorMonthKeys(input.periodKey, input.monthsBack)];
  const windowSet = new Set(windowMonths);
  const parsed = input.rows
    .map(parseReflectionRow)
    .filter((row): row is ParsedReflection => row !== null && windowSet.has(row.monthKey));

  const identities = new Map<string, PersonIdentity>();
  for (const member of input.audience) {
    identities.set(member.userId, { fullName: member.fullName, department: member.departmentRole });
  }
  // The submission snapshot is what the person reported that month, so it wins
  // for name and department; the most recent submission is applied last.
  for (const row of [...parsed].sort((a, b) => a.monthKey.localeCompare(b.monthKey))) {
    const existing = identities.get(row.userId);
    identities.set(row.userId, {
      fullName: row.fullName,
      department: row.department ?? existing?.department ?? 'Unspecified',
    });
  }

  const labels = resolvePersonLabels(identities);
  const labelFor = (userId: string) => labels.get(userId) ?? 'Unknown teammate';
  const departmentFor = (userId: string) => identities.get(userId)?.department ?? 'Unspecified';
  const fullNameFor = (userId: string) => identities.get(userId)?.fullName ?? 'Unknown teammate';

  const reflections: Array<InsightReflection> = parsed
    .map(({ fullName: _fullName, department: _department, ...row }) => ({
      ...row,
      fullName: fullNameFor(row.userId),
      personLabel: labelFor(row.userId),
      department: departmentFor(row.userId),
    }))
    .sort(
      (a, b) =>
        windowMonths.indexOf(a.monthKey) - windowMonths.indexOf(b.monthKey) ||
        a.personLabel.localeCompare(b.personLabel)
    );

  const audience: Array<InsightAudienceMember> = input.audience
    .map((member) => ({
      userId: member.userId,
      fullName: fullNameFor(member.userId),
      personLabel: labelFor(member.userId),
      department: departmentFor(member.userId),
    }))
    .sort((a, b) => a.personLabel.localeCompare(b.personLabel));

  return {
    periodKey: input.periodKey,
    monthsBack: input.monthsBack,
    windowMonths,
    reflections,
    audience,
  };
}

/**
 * Loads 5% reflections for the window through the RLS-scoped client
 * (performance admins pass its SELECT policy since 20261025000002). The
 * audience directory needs the admin client, so callers must check
 * `isPerformanceAdmin` first, as the existing admin reflections route does.
 */
export async function loadInsightSource(
  supabase: SupabaseClient,
  supabaseAdmin: SupabaseClient,
  periodKey: string,
  monthsBack: number
): Promise<InsightSource> {
  const config = SUMMARY_SOURCE_CONFIG.five_percent;
  const windowMonths = [periodKey, ...priorMonthKeys(periodKey, monthsBack)];

  const [reflectionResult, audience] = await Promise.all([
    supabase
      .from(config.table)
      .select(`user_id, full_name, month_key, ${config.selectColumns}`)
      .in(config.periodColumn, windowMonths)
      .is('deleted_at', null),
    listPerformanceAudience(supabaseAdmin),
  ]);

  if (reflectionResult.error) {
    throw new Error(`Failed to load 5% reflections: ${reflectionResult.error.message}`);
  }

  return buildInsightSource({
    periodKey,
    monthsBack,
    rows: (reflectionResult.data as Array<unknown> | null) ?? [],
    audience,
  });
}
