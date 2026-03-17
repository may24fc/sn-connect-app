'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useInView } from 'framer-motion';

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

function useCountUp(target: number, isInView: boolean, duration = 1500) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isInView || hasAnimated.current) return;
    hasAnimated.current = true;

    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      // Ease-out: decelerate towards the end
      const progress = step / steps;
      current = Math.round(target * (1 - Math.pow(1 - progress, 3)));
      setCount(current);
      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [isInView, target, duration]);

  return count;
}

function StatCard({ stat }: { stat: StatItem }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const count = useCountUp(stat.value, isInView);

  return (
    <div
      ref={ref}
      className="p-8 text-center duration-300"
    >
      <p className="text-4xl font-bold text-zinc-900 hover:text-amber-600 transition-colors duration-300">
        {count}
        {stat.suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-zinc-600">{stat.label}</p>
    </div>
  );
}

export function CountUpStats({ stats }: { stats: StatItem[] }): ReactNode {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}
