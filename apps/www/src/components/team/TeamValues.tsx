'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { Zap, Users, Target, Shield, Lightbulb, Heart } from 'lucide-react';

const VALUES = [
  {
    icon: Target,
    title: 'Execution First',
    description:
      'We prioritize ruthlessly, ship early, and iterate fast. Every task has an owner and a deadline.',
  },
  {
    icon: Users,
    title: 'Radical Collaboration',
    description:
      'We work across roles and time zones. Helping others is part of the job, not an extra.',
  },
  {
    icon: Lightbulb,
    title: 'Curiosity-Driven',
    description:
      'We ask questions, dig deeper, and explore new approaches. Learning never stops here.',
  },
  {
    icon: Shield,
    title: 'Trust & Transparency',
    description:
      'We communicate directly, assume positive intent, and share context openly.',
  },
  {
    icon: Zap,
    title: 'Quality at Speed',
    description:
      'Small details compound. We care about craft without letting perfectionism slow us down.',
  },
  {
    icon: Heart,
    title: 'People-Centered',
    description:
      'We build for people — our clients, our team, and the communities we serve.',
  },
];

function ValueCard({
  value,
  index,
  isInView,
}: {
  value: (typeof VALUES)[number];
  index: number;
  isInView: boolean;
}) {
  const Icon = value.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className="group relative rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_12px_36px_-16px_rgba(15,23,42,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-200/60 hover:shadow-[0_20px_50px_-16px_rgba(15,23,42,0.14)]"
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition-colors duration-300 group-hover:bg-primary-100">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-sm font-bold text-zinc-900">
        {value.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">
        {value.description}
      </p>
    </motion.div>
  );
}

export function TeamValues(): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <div
      ref={ref}
      className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {VALUES.map((value, i) => (
        <ValueCard
          key={value.title}
          value={value}
          index={i}
          isInView={isInView}
        />
      ))}
    </div>
  );
}
