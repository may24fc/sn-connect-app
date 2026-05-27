const MS_PER_DAY = 86_400_000;

export type EvaluationCadenceKind = 'monthly' | 'quarterly';
export type EvaluationCadenceStage = 'inactive' | 'launch' | 'active' | 'reminder' | 'deadline';
export type EvaluationCadenceSeverity = 'critical' | 'warning' | 'info';

export interface EvaluationWindowStatus {
  kind: EvaluationCadenceKind;
  key: string;
  label: string;
  dueDate: string;
  dueDateLabel: string;
  openDate: string;
  daysUntilDue: number;
  stage: EvaluationCadenceStage;
  isOpen: boolean;
}

export interface EvaluationCadencePrompt {
  id: string;
  kind: EvaluationCadenceKind;
  stage: Exclude<EvaluationCadenceStage, 'inactive'>;
  severity: EvaluationCadenceSeverity;
  title: string;
  description: string;
  href: string;
  meta?: string;
  actionLabel: string;
  count: number;
}

export interface EvaluationCadenceBanner {
  kind: 'combined' | EvaluationCadenceKind;
  stage: 'deadline';
  severity: EvaluationCadenceSeverity;
  title: string;
  description: string;
  href: string;
  meta?: string;
  actionLabel: string;
}

export interface EvaluationCadenceSummary {
  monthly: EvaluationWindowStatus;
  quarterly: EvaluationWindowStatus;
  prompts: EvaluationCadencePrompt[];
  banner: EvaluationCadenceBanner | null;
}

function toUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addCalendarDays(date: Date, days: number): Date {
  return new Date(toUtcDate(date).getTime() + days * MS_PER_DAY);
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function addBusinessDays(date: Date, offset: number): Date {
  if (offset === 0) {
    return toUtcDate(date);
  }

  let cursor = toUtcDate(date);
  let remaining = Math.abs(offset);
  const direction = offset > 0 ? 1 : -1;

  while (remaining > 0) {
    cursor = addCalendarDays(cursor, direction);
    if (!isWeekend(cursor)) {
      remaining -= 1;
    }
  }

  return cursor;
}

function countBusinessDaysUntil(dueDate: Date, now: Date): number {
  const start = toUtcDate(now);
  const end = toUtcDate(dueDate);

  if (start >= end) {
    return 0;
  }

  let count = 0;
  let cursor = start;
  while (cursor < end) {
    cursor = addCalendarDays(cursor, 1);
    if (!isWeekend(cursor)) {
      count += 1;
    }
  }

  return count;
}

function countCalendarDaysUntil(dueDate: Date, now: Date): number {
  const start = toUtcDate(now).getTime();
  const end = toUtcDate(dueDate).getTime();
  return Math.round((end - start) / MS_PER_DAY);
}

function formatIsoDate(date: Date): string {
  return toUtcDate(date).toISOString().slice(0, 10);
}

function formatMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatQuarterKey(date: Date): string {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatQuarterLabel(date: Date): string {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${date.getUTCFullYear()}`;
}

function formatDueDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function parseIsoDate(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return toUtcDate(value);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toUtcDate(parsed);
}

function getLastWorkingDayOfMonth(date: Date): Date {
  let cursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  while (isWeekend(cursor)) {
    cursor = addCalendarDays(cursor, -1);
  }
  return cursor;
}

function getLastWorkingDayOfQuarter(date: Date): Date {
  const quarterEndMonth = Math.floor(date.getUTCMonth() / 3) * 3 + 2;
  let cursor = new Date(Date.UTC(date.getUTCFullYear(), quarterEndMonth + 1, 0));
  while (isWeekend(cursor)) {
    cursor = addCalendarDays(cursor, -1);
  }
  return cursor;
}

export function getMonthlyEvaluationWindow(now: Date = new Date()): EvaluationWindowStatus {
  const today = toUtcDate(now);
  const dueDate = getLastWorkingDayOfMonth(today);
  const openDate = addBusinessDays(dueDate, -3);
  const daysUntilDue = countBusinessDaysUntil(dueDate, today);

  let stage: EvaluationCadenceStage = 'inactive';
  if (today >= openDate) {
    if (today >= dueDate) {
      stage = 'deadline';
    } else if (daysUntilDue === 3) {
      stage = 'launch';
    } else if (daysUntilDue === 1) {
      stage = 'reminder';
    } else {
      stage = 'active';
    }
  }

  return {
    kind: 'monthly',
    key: formatMonthKey(today),
    label: formatMonthLabel(today),
    dueDate: formatIsoDate(dueDate),
    dueDateLabel: formatDueDateLabel(dueDate),
    openDate: formatIsoDate(openDate),
    daysUntilDue,
    stage,
    isOpen: stage !== 'inactive',
  };
}

export function getQuarterlyEvaluationWindow(
  now: Date = new Date(),
  dueDateOverride?: string | Date | null
): EvaluationWindowStatus {
  const today = toUtcDate(now);
  const dueDate = parseIsoDate(dueDateOverride) ?? getLastWorkingDayOfQuarter(today);
  const openDate = addCalendarDays(dueDate, -7);
  const daysUntilDue = countCalendarDaysUntil(dueDate, today);

  let stage: EvaluationCadenceStage = 'inactive';
  if (today >= openDate) {
    if (daysUntilDue <= 1) {
      stage = 'deadline';
    } else if (daysUntilDue === 7) {
      stage = 'launch';
    } else if (daysUntilDue === 3) {
      stage = 'reminder';
    } else {
      stage = 'active';
    }
  }

  return {
    kind: 'quarterly',
    key: formatQuarterKey(today),
    label: formatQuarterLabel(today),
    dueDate: formatIsoDate(dueDate),
    dueDateLabel: formatDueDateLabel(dueDate),
    openDate: formatIsoDate(openDate),
    daysUntilDue,
    stage,
    isOpen: stage !== 'inactive',
  };
}

function buildPromptMeta(window: EvaluationWindowStatus): string | undefined {
  if (window.stage === 'launch') {
    return 'Window just opened';
  }

  if (window.stage === 'reminder') {
    return window.daysUntilDue <= 1 ? 'Due tomorrow' : `${window.daysUntilDue} days left`;
  }

  if (window.stage === 'deadline') {
    return window.daysUntilDue <= 0 ? 'Due now' : 'Due tomorrow';
  }

  if (window.stage === 'active') {
    return `Due ${window.dueDateLabel}`;
  }

  return undefined;
}

function buildPrompt(
  window: EvaluationWindowStatus,
  submitted: boolean
): EvaluationCadencePrompt | null {
  if (submitted || window.stage === 'inactive') {
    return null;
  }

  const href =
    window.kind === 'monthly'
      ? '/performance/self-evaluation?tab=monthly'
      : '/performance/self-evaluation?tab=quarterly';

  const actionLabel =
    window.kind === 'monthly' ? 'Open monthly check-in' : 'Open quarterly check-in';

  if (window.kind === 'monthly') {
    const meta = buildPromptMeta(window);
    const severity =
      window.stage === 'deadline'
        ? 'critical'
        : window.stage === 'reminder'
          ? 'warning'
          : 'info';

    const description =
      window.stage === 'launch'
        ? `Your ${window.label} reflection window is now open. Submit it before ${window.dueDateLabel}.`
        : window.stage === 'reminder'
          ? `Your ${window.label} self-evaluation is still pending. Please submit it before ${window.dueDateLabel}.`
          : window.stage === 'deadline'
            ? `Your ${window.label} self-evaluation is due today. Submit it before the workday closes.`
            : `Your ${window.label} self-evaluation is open. Complete it before ${window.dueDateLabel}.`;

    const prompt: EvaluationCadencePrompt = {
      id: `monthly-${window.key}`,
      kind: 'monthly',
      stage: window.stage,
      severity,
      title: `Monthly self-evaluation for ${window.label}`,
      description,
      href,
      actionLabel,
      count: 1,
    };

    if (meta) {
      prompt.meta = meta;
    }

    return prompt;
  }

  const meta = buildPromptMeta(window);
  const severity =
    window.stage === 'deadline'
      ? window.daysUntilDue <= 0
        ? 'critical'
        : 'warning'
      : window.stage === 'reminder'
        ? 'warning'
        : 'info';

  const description =
    window.stage === 'launch'
      ? `The ${window.label} quarterly temperature check is now open. Share your feedback before ${window.dueDateLabel}.`
      : window.stage === 'reminder'
        ? `The ${window.label} quarterly temperature check is still waiting on you. Please complete it before ${window.dueDateLabel}.`
        : window.stage === 'deadline'
          ? window.daysUntilDue <= 0
            ? `Your ${window.label} quarterly temperature check is due today.`
            : `Final countdown: your ${window.label} quarterly temperature check is due tomorrow.`
          : `Your ${window.label} quarterly temperature check is open. Submit it before ${window.dueDateLabel}.`;

  const prompt: EvaluationCadencePrompt = {
    id: `quarterly-${window.key}`,
    kind: 'quarterly',
    stage: window.stage,
    severity,
    title: `Quarterly temperature check for ${window.label}`,
    description,
    href,
    actionLabel,
    count: 1,
  };

  if (meta) {
    prompt.meta = meta;
  }

  return prompt;
}

function buildBanner(
  monthly: EvaluationWindowStatus,
  monthlySubmitted: boolean,
  quarterly: EvaluationWindowStatus,
  quarterlySubmitted: boolean
): EvaluationCadenceBanner | null {
  const monthlyDue = !monthlySubmitted && monthly.stage === 'deadline';
  const quarterlyDue = !quarterlySubmitted && quarterly.stage === 'deadline';

  if (monthlyDue && quarterlyDue) {
    return {
      kind: 'combined',
      stage: 'deadline',
      severity: 'critical',
      title: 'Two evaluation check-ins need action',
      description:
        'Your monthly self-evaluation and quarterly temperature check are both at the final reminder stage.',
      href: '/performance/self-evaluation',
      meta: 'Open both forms now',
      actionLabel: 'Open self-evaluations',
    };
  }

  if (monthlyDue) {
    return {
      kind: 'monthly',
      stage: 'deadline',
      severity: 'critical',
      title: `${monthly.label} self-evaluation is due now`,
      description:
        'Keep the monthly review cadence on track by submitting your self-evaluation before the day closes.',
      href: '/performance/self-evaluation?tab=monthly',
      meta: `Due ${monthly.dueDateLabel}`,
      actionLabel: 'Submit monthly review',
    };
  }

  if (quarterlyDue) {
    return {
      kind: 'quarterly',
      stage: 'deadline',
      severity: quarterly.daysUntilDue <= 0 ? 'critical' : 'warning',
      title:
        quarterly.daysUntilDue <= 0
          ? `${quarterly.label} quarterly check is due now`
          : `${quarterly.label} quarterly check is due tomorrow`,
      description:
        `Leadership is waiting for your quarterly temperature check. Submit it before ${quarterly.dueDateLabel}.`,
      href: '/performance/self-evaluation?tab=quarterly',
      meta: `Due ${quarterly.dueDateLabel}`,
      actionLabel: 'Submit quarterly check',
    };
  }

  return null;
}

export function buildEvaluationCadenceSummary(
  params: {
    monthlySubmitted: boolean;
    quarterlySubmitted: boolean;
  },
  now: Date = new Date(),
  options?: {
    quarterlyDueDate?: string | Date | null;
  }
): EvaluationCadenceSummary {
  const monthly = getMonthlyEvaluationWindow(now);
  const quarterly = getQuarterlyEvaluationWindow(now, options?.quarterlyDueDate ?? null);

  const prompts = [
    buildPrompt(monthly, params.monthlySubmitted),
    buildPrompt(quarterly, params.quarterlySubmitted),
  ].filter((value): value is EvaluationCadencePrompt => value !== null);

  return {
    monthly,
    quarterly,
    prompts,
    banner: buildBanner(monthly, params.monthlySubmitted, quarterly, params.quarterlySubmitted),
  };
}