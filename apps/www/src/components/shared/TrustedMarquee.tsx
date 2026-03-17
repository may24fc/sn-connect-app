import type { ReactNode } from 'react';

interface LogoItem {
  name: string;
  colorClass: string;
  weightClass: string;
  case?: 'caps';
}

const LOGOS: LogoItem[] = [
  { name: 'Ayala Group',    colorClass: 'text-zinc-800',    weightClass: 'font-semibold' },
  { name: 'SM Investments', colorClass: 'text-yellow-600',  weightClass: 'font-bold' },
  { name: 'JG Summit',      colorClass: 'text-zinc-700',    weightClass: 'font-medium' },
  { name: 'BDO Unibank',    colorClass: 'text-blue-700',    weightClass: 'font-bold' },
  { name: 'Globe Telecom',  colorClass: 'text-blue-500',    weightClass: 'font-semibold' },
  { name: 'San Miguel',     colorClass: 'text-zinc-800',    weightClass: 'font-semibold' },
  { name: 'Metrobank',      colorClass: 'text-red-700',     weightClass: 'font-bold' },
  { name: 'PLDT',           colorClass: 'text-red-600',     weightClass: 'font-black',   case: 'caps' },
  { name: 'Jollibee',       colorClass: 'text-orange-500',  weightClass: 'font-bold' },
  { name: 'Meralco',        colorClass: 'text-yellow-500',  weightClass: 'font-bold' },
  { name: 'PhilHealth',     colorClass: 'text-emerald-600', weightClass: 'font-semibold' },
  { name: 'Metro Pacific',  colorClass: 'text-zinc-700',    weightClass: 'font-medium' },
];

const ITEM_CLASS = (logo: LogoItem) =>
  `inline-flex shrink-0 items-center text-[15px] tracking-tight opacity-40 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 ${logo.colorClass} ${logo.weightClass}`;

export function TrustedMarquee({ label = 'Trusted by leading organizations' }: { label?: string }): ReactNode {
  return (
    <section className="border-y border-zinc-100 bg-zinc-50 py-10 overflow-hidden">
      <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
        {label}
      </p>

      {/*
        Single flex track: [set A · · ·][set B · · ·]
        The animation translates by -50% of the track's total width = exactly one set's width.
        Since both sets are identical, the loop is perfectly seamless with no gap.
      */}
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-zinc-50 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-zinc-50 to-transparent" />

        <div className="animate-marquee group-hover:[animation-play-state:paused] flex w-max items-center gap-8">
          {/* Set A */}
          {LOGOS.map((logo, i) => (
            <span key={`a-${i}`} className={ITEM_CLASS(logo)}>
              {logo.case === 'caps' ? logo.name.toUpperCase() : logo.name}
            </span>
          ))}
          {/* Separator between sets — matches gap-8 visually */}
          <span className="shrink-0 text-zinc-300 select-none" aria-hidden="true">·</span>

          {/* Set B — identical, aria-hidden; -50% translate lands exactly here */}
          {LOGOS.map((logo, i) => (
            <span key={`b-${i}`} aria-hidden="true" className={ITEM_CLASS(logo)}>
              {logo.case === 'caps' ? logo.name.toUpperCase() : logo.name}
            </span>
          ))}
          {/* Trailing separator so snap-back position matches set A's leading spacing */}
          <span className="shrink-0 text-zinc-300 select-none" aria-hidden="true">·</span>
        </div>
      </div>
    </section>
  );
}
