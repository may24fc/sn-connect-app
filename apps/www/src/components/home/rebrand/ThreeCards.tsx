'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const cardsData = [
  {
    index: '01.',
    heading: 'Specialized Talent',
    text: 'Professionals matched to your goals and ready to contribute.',
    bg: '#ffffff',
    textColor: '#0c1d2e',
    textOpacity: 'rgba(12,29,46,0.65)',
    icon: 'https://integratedbio.com/wp-content/uploads/2025/09/icon-1.svg',
  },
  {
    index: '02.',
    heading: 'AI-Enabled Execution',
    text: 'AI-powered workflows that improve speed, quality, and efficiency.',
    bg: '#0c1d2e',
    textColor: '#d6e4f0',
    textOpacity: 'rgba(214,228,240,0.65)',
    icon: 'https://integratedbio.com/wp-content/uploads/2025/09/icon-2.svg',
  },
  {
    index: '03.',
    heading: 'Faster Time to Value',
    text: 'Integrated quickly and delivering results from day one.',
    bg: '#a1c6e7',
    textColor: '#0c1d2e',
    textOpacity: 'rgba(12,29,46,0.65)',
    icon: 'https://integratedbio.com/wp-content/uploads/2025/09/icon-3.svg',
  },
];

const ease = [0.19, 1, 0.22, 1] as const;

interface CardProps {
  card: (typeof cardsData)[number];
  idx: number;
}

function Card({ card, idx }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  // Stagger each card's reveal slightly based on its column index
  const baseDelay = idx * 0.1;

  return (
    <div
      ref={ref}
      className="relative flex flex-col justify-between px-8 py-10 sm:px-10 sm:py-12 md:px-12 md:py-14 h-[420px]"
      id={`three-cards-item-${idx + 1}`}
    >
      {/* Background — slides in from left */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: card.bg }}
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: inView ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
        transition={{ duration: 0.85, delay: baseDelay, ease }}
      />

      {/* Top: icon + index — fades down */}
      <motion.div
        className="relative z-10 flex items-start justify-between"
        initial={{ opacity: 0, y: -14 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -14 }}
        transition={{ duration: 0.7, delay: baseDelay + 0.32, ease }}
      >
        {card.icon && (
          <img
            decoding="async"
            src={card.icon}
            alt={card.heading}
            referrerPolicy="no-referrer"
            className="w-24 h-24 md:w-28 md:h-28 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <span
          className="button-mono text-sm font-medium tracking-[0.15em]"
          style={{ color: card.textColor }}
        >
          {card.index}
        </span>
      </motion.div>

      {/* Bottom: heading then subtext — slides up */}
      <div className="relative z-10 flex flex-col gap-3 md:gap-4">
        <div className="overflow-hidden pb-[0.04em]">
          <motion.h4
            className="text-2xl sm:text-3xl lg:text-[32px] font-normal leading-tight tracking-tight font-sans"
            style={{ color: card.textColor }}
            initial={{ y: '110%' }}
            animate={{ y: inView ? 0 : '110%' }}
            transition={{ duration: 0.85, delay: baseDelay + 0.48, ease }}
          >
            {card.heading}
          </motion.h4>
        </div>
        <div className="overflow-hidden">
          <motion.p
            className="text-sm md:text-lg tracking-[-0.04em] font-normal max-w-sm line-clamp-2"
            style={{ color: card.textOpacity, lineHeight: '1.35' }}
            initial={{ y: '110%' }}
            animate={{ y: inView ? 0 : '110%' }}
            transition={{ duration: 0.85, delay: baseDelay + 0.62, ease }}
          >
            {card.text}
          </motion.p>
        </div>
      </div>
    </div>
  );
}

export default function ThreeCards() {
  return (
    <section className="relative w-full overflow-hidden select-none" id="three-cards-section">
      <div className="w-full grid grid-cols-1 md:grid-cols-3" id="three-cards-grid">
        {cardsData.map((card, idx) => (
          <Card key={card.index} card={card} idx={idx} />
        ))}
      </div>
    </section>
  );
}
