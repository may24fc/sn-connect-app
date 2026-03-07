'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function MeshGradientHero({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="relative overflow-hidden">
      {/* Animated mesh gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full opacity-[0.15] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #4F46E5 0%, transparent 70%)' }}
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full opacity-[0.12] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #818CF8 0%, transparent 70%)' }}
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full opacity-[0.08] blur-[80px]"
          style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)' }}
          animate={{ x: [0, 30, -30, 0], y: [0, -20, 20, 0] }}
          transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
      </div>

      {/* Subtle dot grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle, #4F46E5 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {children}
    </div>
  );
}
