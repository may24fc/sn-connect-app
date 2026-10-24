/** Limits for the performance insights ("Ask AI") assistant. */

export const INSIGHT_MODEL = 'gpt-5.4-mini';

export const INSIGHT_DEFAULT_MONTHS_BACK = 3;
export const INSIGHT_MAX_MONTHS_BACK = 6;

export const INSIGHT_MAX_QUESTION_CHARS = 2000;
export const INSIGHT_TITLE_MAX_CHARS = 60;

/** Most recent stored messages replayed to the model (user + assistant). */
export const INSIGHT_HISTORY_MESSAGES = 10;
/** Older assistant answers are clipped before replay to bound history tokens. */
export const INSIGHT_HISTORY_ASSISTANT_CHARS = 1500;

export const INSIGHT_RATE_LIMIT_PER_HOUR = 30;
export const INSIGHT_RATE_LIMIT_PER_DAY = 150;

export const INSIGHT_MAX_OUTPUT_TOKENS = 1500;
/** Upper bound for persisted assistant content (matches the DB check). */
export const INSIGHT_MAX_STORED_CHARS = 20000;

/** Approximate token budgets (chars / 4) for each prompt block. */
export const INSIGHT_TOKEN_BUDGET = {
  statsAndRoster: 4000,
  selectedMonth: 40000,
  priorMonths: 12000,
  history: 6000,
} as const;
