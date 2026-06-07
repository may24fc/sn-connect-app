'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function HeroBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-white/20 mb-6 w-fit shadow-lg"
      id="hero-badge"
    >
      <Sparkles className="w-4 h-4 text-[#1e325a]" id="hero-badge-sparkles" />
      <span className="text-[14px] font-semibold text-[#1e325a]" id="hero-badge-text">
        Fluid Staking
      </span>
    </motion.div>
  );
}
