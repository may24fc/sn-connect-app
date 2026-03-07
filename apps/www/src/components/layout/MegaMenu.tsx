import type { ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BusinessUnit {
  slug: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  color: string;
}

interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
  businesses: BusinessUnit[];
}

export function MegaMenu({ open, businesses }: MegaMenuProps): ReactNode {
  if (!open) return null;

  return (
    <div className="absolute top-full left-1/2 z-50 w-[560px] -translate-x-1/2 pt-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-mega">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Our Businesses
          </h3>
          <Link
            href="/businesses"
            className="text-xs font-medium text-indigo-600 transition-colors hover:text-indigo-700"
          >
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {businesses.map((unit) => (
            <Link
              key={unit.slug}
              href={`/businesses/${unit.slug}`}
              className={cn(
                'group rounded-lg p-3 transition-colors',
                'hover:bg-zinc-50'
              )}
            >
              <p className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-600">
                {unit.name}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {unit.tagline}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
