'use client';

import type { ReactNode } from 'react';
import { User } from 'lucide-react';
import { ScrollReveal } from '@/components/shared/ScrollReveal';

interface TeamMember {
  name: string;
  title: string;
  department: string;
  image?: string;
}

interface TeamGridProps {
  members: TeamMember[];
}

export function TeamGrid({ members }: TeamGridProps): ReactNode {
  return (
    <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {members.map((member, i) => (
        <ScrollReveal key={member.name} delay={i * 0.05}>
          <div className="group rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-card transition-all hover:shadow-mega hover:border-indigo-200">
            {/* Avatar placeholder */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 group-hover:bg-indigo-50 transition-colors">
              <User className="h-8 w-8 text-zinc-300 group-hover:text-indigo-600 transition-colors" />
            </div>
            <h4 className="mt-4 font-semibold text-zinc-900">{member.name}</h4>
            <p className="text-sm text-indigo-600">{member.title}</p>
            <p className="mt-1 text-xs text-zinc-500">{member.department}</p>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
