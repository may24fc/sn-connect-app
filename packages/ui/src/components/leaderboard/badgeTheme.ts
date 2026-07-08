import { Bot, Clapperboard, DollarSign, Palette, TrendingUp, Users, type LucideIcon } from 'lucide-react';

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Department → base Tailwind color family, shared across badge icon, badge rows and mastery tracks. */
export const DOMAIN_BASE: Record<string, string> = {
  'AI & Automation': 'violet',
  Marketing: 'emerald',
  HR: 'sky',
  Design: 'pink',
  'Graphic Design': 'pink',
  Video: 'rose',
  Accounting: 'amber',
};

export const RARITY_LABEL: Record<BadgeRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

/** Icon-circle fill/border classes, tinted per domain + rarity tier. Used by <BadgeIcon />. */
export function getDomainRarityClasses(department: string, rarity: BadgeRarity): string | null {
  const base = DOMAIN_BASE[department];
  if (!base) return null;

  const map: Record<string, Record<BadgeRarity, string>> = {
    violet: {
      common: 'border-violet-300 bg-violet-50 text-violet-600 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
      uncommon: 'border-violet-400 bg-violet-100 text-violet-700 dark:border-violet-600 dark:bg-violet-950/45 dark:text-violet-300',
      rare: 'border-violet-500 bg-violet-200 text-violet-800 dark:border-violet-500 dark:bg-violet-950/60 dark:text-violet-200',
      legendary: 'border-violet-600 bg-violet-300 text-violet-900 dark:border-violet-400 dark:bg-violet-900/80 dark:text-violet-100',
    },
    emerald: {
      common: 'border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
      uncommon: 'border-emerald-400 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/45 dark:text-emerald-300',
      rare: 'border-emerald-500 bg-emerald-200 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-200',
      legendary: 'border-emerald-600 bg-emerald-300 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-900/80 dark:text-emerald-100',
    },
    sky: {
      common: 'border-sky-300 bg-sky-50 text-sky-600 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
      uncommon: 'border-sky-400 bg-sky-100 text-sky-700 dark:border-sky-600 dark:bg-sky-950/45 dark:text-sky-300',
      rare: 'border-sky-500 bg-sky-200 text-sky-800 dark:border-sky-500 dark:bg-sky-950/60 dark:text-sky-200',
      legendary: 'border-sky-600 bg-sky-300 text-sky-900 dark:border-sky-400 dark:bg-sky-900/80 dark:text-sky-100',
    },
    pink: {
      common: 'border-pink-300 bg-pink-50 text-pink-600 dark:border-pink-700 dark:bg-pink-950/30 dark:text-pink-300',
      uncommon: 'border-pink-400 bg-pink-100 text-pink-700 dark:border-pink-600 dark:bg-pink-950/45 dark:text-pink-300',
      rare: 'border-pink-500 bg-pink-200 text-pink-800 dark:border-pink-500 dark:bg-pink-950/60 dark:text-pink-200',
      legendary: 'border-pink-600 bg-pink-300 text-pink-900 dark:border-pink-400 dark:bg-pink-900/80 dark:text-pink-100',
    },
    rose: {
      common: 'border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
      uncommon: 'border-rose-400 bg-rose-100 text-rose-700 dark:border-rose-600 dark:bg-rose-950/45 dark:text-rose-300',
      rare: 'border-rose-500 bg-rose-200 text-rose-800 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-200',
      legendary: 'border-rose-600 bg-rose-300 text-rose-900 dark:border-rose-400 dark:bg-rose-900/80 dark:text-rose-100',
    },
    amber: {
      common: 'border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
      uncommon: 'border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-600 dark:bg-amber-950/45 dark:text-amber-300',
      rare: 'border-amber-500 bg-amber-200 text-amber-800 dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-200',
      legendary: 'border-amber-600 bg-amber-300 text-amber-900 dark:border-amber-400 dark:bg-amber-900/80 dark:text-amber-100',
    },
  };

  return map[base]?.[rarity] ?? null;
}

/** Row background/border tint for badge list rows, matched to domain + rarity. */
export function getBadgeRowTone(department: string | null, rarity: BadgeRarity): string {
  const base = department ? DOMAIN_BASE[department] : null;

  const map: Record<string, Record<BadgeRarity, string>> = {
    violet: {
      common: 'border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/20',
      uncommon: 'border-violet-300 bg-violet-100/50 dark:border-violet-800 dark:bg-violet-950/30',
      rare: 'border-violet-400 bg-violet-100/70 dark:border-violet-700 dark:bg-violet-950/40',
      legendary: 'border-violet-500 bg-violet-200/60 dark:border-violet-600 dark:bg-violet-900/45',
    },
    emerald: {
      common: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20',
      uncommon: 'border-emerald-300 bg-emerald-100/50 dark:border-emerald-800 dark:bg-emerald-950/30',
      rare: 'border-emerald-400 bg-emerald-100/70 dark:border-emerald-700 dark:bg-emerald-950/40',
      legendary: 'border-emerald-500 bg-emerald-200/60 dark:border-emerald-600 dark:bg-emerald-900/45',
    },
    sky: {
      common: 'border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/20',
      uncommon: 'border-sky-300 bg-sky-100/50 dark:border-sky-800 dark:bg-sky-950/30',
      rare: 'border-sky-400 bg-sky-100/70 dark:border-sky-700 dark:bg-sky-950/40',
      legendary: 'border-sky-500 bg-sky-200/60 dark:border-sky-600 dark:bg-sky-900/45',
    },
    pink: {
      common: 'border-pink-200 bg-pink-50/60 dark:border-pink-900 dark:bg-pink-950/20',
      uncommon: 'border-pink-300 bg-pink-100/50 dark:border-pink-800 dark:bg-pink-950/30',
      rare: 'border-pink-400 bg-pink-100/70 dark:border-pink-700 dark:bg-pink-950/40',
      legendary: 'border-pink-500 bg-pink-200/60 dark:border-pink-600 dark:bg-pink-900/45',
    },
    rose: {
      common: 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20',
      uncommon: 'border-rose-300 bg-rose-100/50 dark:border-rose-800 dark:bg-rose-950/30',
      rare: 'border-rose-400 bg-rose-100/70 dark:border-rose-700 dark:bg-rose-950/40',
      legendary: 'border-rose-500 bg-rose-200/60 dark:border-rose-600 dark:bg-rose-900/45',
    },
    amber: {
      common: 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
      uncommon: 'border-amber-300 bg-amber-100/50 dark:border-amber-800 dark:bg-amber-950/30',
      rare: 'border-amber-400 bg-amber-100/70 dark:border-amber-700 dark:bg-amber-950/40',
      legendary: 'border-amber-500 bg-amber-200/60 dark:border-amber-600 dark:bg-amber-900/45',
    },
  };

  const fallback: Record<BadgeRarity, string> = {
    common: 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40',
    uncommon: 'border-zinc-300 bg-zinc-100/70 dark:border-zinc-700 dark:bg-zinc-900/55',
    rare: 'border-zinc-400 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900/70',
    legendary: 'border-zinc-500 bg-zinc-200/70 dark:border-zinc-500 dark:bg-zinc-800/80',
  };

  return (base ? map[base]?.[rarity] : null) ?? fallback[rarity];
}

/** Extra container polish (shadow/ring) that scales with rarity, so higher tiers feel more "premium". */
export function getRarityContainerClasses(rarity: BadgeRarity): string {
  const classes: Record<BadgeRarity, string> = {
    common: '',
    uncommon: 'shadow-sm',
    rare: 'shadow-md ring-1 ring-amber-300/40 dark:ring-amber-700/30',
    legendary:
      'shadow-lg ring-1 ring-purple-400/50 shadow-purple-500/20 dark:ring-purple-500/40 dark:shadow-purple-900/40',
  };
  return classes[rarity];
}

/** Small rarity pill classes shown alongside a badge row. */
export function getRarityTagClasses(rarity: BadgeRarity): string {
  const classes: Record<BadgeRarity, string> = {
    common: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    uncommon: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    rare: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    legendary:
      'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-sm shadow-purple-500/40',
  };
  return classes[rarity];
}

/** Department → icon, shared with mastery tracks so a project's dominant domain reads consistently. */
export const DOMAIN_ICON: Record<string, LucideIcon> = {
  'AI & Automation': Bot,
  Marketing: TrendingUp,
  HR: Users,
  Design: Palette,
  'Graphic Design': Palette,
  Video: Clapperboard,
  Accounting: DollarSign,
};

/** Accent border + icon-chip classes for a domain, used on project cards to signal the active mastery track. */
export function getDomainAccentClasses(
  department: string | null | undefined
): { border: string; iconWrap: string; icon: string } | null {
  const base = department ? DOMAIN_BASE[department] : null;
  if (!base) return null;

  const map: Record<string, { border: string; iconWrap: string; icon: string }> = {
    violet: {
      border: 'border-l-4 border-l-violet-500 dark:border-l-violet-400',
      iconWrap: 'bg-violet-100 dark:bg-violet-950/40',
      icon: 'text-violet-600 dark:text-violet-400',
    },
    emerald: {
      border: 'border-l-4 border-l-emerald-500 dark:border-l-emerald-400',
      iconWrap: 'bg-emerald-100 dark:bg-emerald-950/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
    sky: {
      border: 'border-l-4 border-l-sky-500 dark:border-l-sky-400',
      iconWrap: 'bg-sky-100 dark:bg-sky-950/40',
      icon: 'text-sky-600 dark:text-sky-400',
    },
    pink: {
      border: 'border-l-4 border-l-pink-500 dark:border-l-pink-400',
      iconWrap: 'bg-pink-100 dark:bg-pink-950/40',
      icon: 'text-pink-600 dark:text-pink-400',
    },
    rose: {
      border: 'border-l-4 border-l-rose-500 dark:border-l-rose-400',
      iconWrap: 'bg-rose-100 dark:bg-rose-950/40',
      icon: 'text-rose-600 dark:text-rose-400',
    },
    amber: {
      border: 'border-l-4 border-l-amber-500 dark:border-l-amber-400',
      iconWrap: 'bg-amber-100 dark:bg-amber-950/40',
      icon: 'text-amber-600 dark:text-amber-400',
    },
  };

  return map[base] ?? null;
}
