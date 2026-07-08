// Shared department → mastery title stem mapping.
// Used by both MasteryTrackCard (client UI) and the leaderboard API route (server)
// so department labels never drift out of sync between the two surfaces.

export const MASTERY_TITLE_STEM: Record<string, string> = {
  'AI & Automation': 'AI Specialist',
  Marketing: 'Growth Hacker',
  HR: 'Talent Architect',
  Design: 'Visual Artisan',
  'Graphic Design': 'Visual Artisan',
  Video: 'Visual Artisan',
  Accounting: 'Fiscal Analyst',
} as const;

export const MASTERY_TITLE_STEM_FALLBACK = 'Specialist';

/** 7-level XP breakpoints shared with the DB's compute_mastery_level() function. */
export const MASTERY_LEVEL_THRESHOLDS = [0, 150, 450, 900, 1500, 2400, 3600] as const;

/** Builds a display title like "Level 5 Automator" for a department + level. */
export function formatMasteryTitle(department: string, level: number): string {
  const stem = MASTERY_TITLE_STEM[department] ?? MASTERY_TITLE_STEM_FALLBACK;
  return `Level ${level} ${stem}`;
}
