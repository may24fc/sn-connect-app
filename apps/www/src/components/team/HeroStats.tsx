'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';

interface StatItem {
  value: number;
  label: string;
  description: string;
}

interface HeroStatsProps {
  stats: StatItem[];
}

function useCountUp(target: number, isInView: boolean, duration = 1200) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const steps = 30;
    const stepTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return count;
}

function StatCard({
  stat,
  index,
  isInView,
}: {
  stat: StatItem;
  index: number;
  isInView: boolean;
}) {
  const count = useCountUp(stat.value, isInView);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className="group relative rounded-2xl border border-zinc-200/80 bg-white/90 p-5 text-left shadow-[0_16px_40px_rgba(23,80,99,0.06)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-200/60 hover:shadow-[0_20px_50px_rgba(23,80,99,0.1)]"
    >
      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-bold tabular-nums text-zinc-950 transition-colors duration-300 group-hover:text-primary-800 sm:text-4xl">
          {count}
        </p>
      </div>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-800">
        {stat.label}
      </p>
      <p className="mt-2.5 text-sm leading-relaxed text-zinc-500">
        {stat.description}
      </p>
    </motion.div>
  );
}

export function HeroStats({ stats }: HeroStatsProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div
      ref={ref}
      className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat, i) => (
        <StatCard
          key={stat.label}
          stat={stat}
          index={i}
          isInView={isInView}
        />
      ))}
    </div>
  );
}
