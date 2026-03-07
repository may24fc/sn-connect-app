'use client';

import type { ReactNode } from 'react';
import { Building2, Users, Calendar, Award } from 'lucide-react';
import { CountUp } from '@/components/shared/CountUp';

const STATS = [
  { icon: Users, value: 500, suffix: '+', label: 'Employees' },
  { icon: Building2, value: 4, suffix: '', label: 'Business Units' },
  { icon: Calendar, value: 15, suffix: '+', label: 'Years of Excellence' },
  { icon: Award, value: 20, suffix: '+', label: 'Industry Awards' },
] as const;

export function SocialProofStrip(): ReactNode {
  return (
    <div className="mt-16">
      <div className="section-max section-padding">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map((stat) => {
            return (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                  <CountUp end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
