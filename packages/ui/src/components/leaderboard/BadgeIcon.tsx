import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Bug,
  Calculator,
  Clock,
  Cpu,
  Film,
  GitBranch,
  Palette,
  PenTool,
  Shield,
  type LucideIcon,
  Star,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { getDomainRarityClasses } from './badgeTheme';

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface BadgeIconProps {
  id: string;
  name: string;
  description: string;
  icon: string;
  department?: string | null;
  rarity: BadgeRarity;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Map Lucide icon name strings → actual components
const ICON_MAP: Record<string, LucideIcon> = {
  Star,
  Clock,
  Bug,
  GitBranch,
  TrendingUp,
  Shield,
  Palette,
  PenTool,
  Film,
  Calculator,
  Cpu,
};

const RARITY_CLASSES: Record<BadgeRarity, string> = {
  common:
    'border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  uncommon:
    'border-indigo-400 bg-indigo-100 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300',
  rare: 'border-amber-400 bg-amber-100 text-amber-700 dark:border-amber-500 dark:bg-amber-950/60 dark:text-amber-300',
  legendary:
    'border-purple-500 bg-purple-100 text-purple-700 dark:border-purple-500 dark:bg-purple-950/60 dark:text-purple-300',
};

const RARITY_LABEL: Record<BadgeRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  legendary: 'Legendary',
};

const SIZE_CLASSES = {
  sm: { wrapper: 'h-7 w-7', icon: 'h-3.5 w-3.5' },
  md: { wrapper: 'h-9 w-9', icon: 'h-4 w-4' },
  lg: { wrapper: 'h-11 w-11', icon: 'h-5 w-5' },
};

export function BadgeIcon({
  name,
  description,
  icon,
  department,
  rarity,
  size = 'md',
  className,
}: BadgeIconProps) {
  const Icon = ICON_MAP[icon] ?? Star;
  const { wrapper, icon: iconSize } = SIZE_CLASSES[size];
  const domainRarityClasses = department ? getDomainRarityClasses(department, rarity) : null;

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
              wrapper,
              domainRarityClasses ?? RARITY_CLASSES[rarity],
              className
            )}
            aria-label={name}
          >
            <Icon className={iconSize} />
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="z-50 max-w-xs rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          >
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{name}</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
            <p
              className={cn(
                'mt-1 text-[10px] font-medium uppercase tracking-wider',
                rarity === 'legendary'
                  ? 'text-purple-600 dark:text-purple-400'
                  : rarity === 'rare'
                    ? 'text-amber-600 dark:text-amber-400'
                    : rarity === 'uncommon'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-500 dark:text-zinc-400'
              )}
            >
              {RARITY_LABEL[rarity]}
            </p>
            <Tooltip.Arrow className="fill-white dark:fill-zinc-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
