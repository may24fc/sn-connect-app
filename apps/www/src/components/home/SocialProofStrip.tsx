'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { Building2, Users, Calendar, Award } from 'lucide-react';
import { CountUp } from '@/components/shared/CountUp';

const FALLBACK_STATS = [
  { icon: Users, value: 500, suffix: '+', label: 'Employees' },
  { icon: Building2, value: 4, suffix: '', label: 'Business Units' },
  { icon: Calendar, value: 15, suffix: '+', label: 'Years of Excellence' },
  { icon: Award, value: 20, suffix: '+', label: 'Industry Awards' },
] as const;

interface StatsData {
  employees: number;
  departments: number;
}

export function SocialProofStrip(): ReactNode {
  const [liveStats, setLiveStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch('/api/public/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StatsData | null) => {
        if (data && (data.employees > 0 || data.departments > 0)) {
          setLiveStats(data);
        }
      })
      .catch(() => {
        // Keep fallback stats on failure
      });
  }, []);

  const stats = liveStats
    ? [
        { icon: Users, value: liveStats.employees, suffix: '+', label: 'Employees' },
        { icon: Building2, value: 4, suffix: '', label: 'Business Units' },
        { icon: Calendar, value: 15, suffix: '+', label: 'Years of Excellence' },
        { icon: Award, value: 20, suffix: '+', label: 'Industry Awards' },
      ]
    : FALLBACK_STATS;

  return (
    <div className="mt-16">
      <div className="section-max section-padding">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((stat) => {
            return (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold tracking-tight text-zinc-900 hover:text-indigo-600 transition-colors duration-300 sm:text-3xl">
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
