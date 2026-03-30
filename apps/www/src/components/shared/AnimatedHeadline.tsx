'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const WORDS = ['executive', 'marketing', 'content', 'AI'];
const INTERVAL = 3000;

export function AnimatedHeadline({ className }: { className?: string }): ReactNode {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      className={cn(
        'inline-flex min-w-[4ch] overflow-hidden align-bottom sm:min-w-[8ch] lg:min-w-[9ch]',
        className
      )}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={WORDS[index]}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className="inline-block text-primary-800"
        >
          {WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
