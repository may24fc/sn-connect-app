'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ_ITEMS = [
  {
    question: 'Forgot your password?',
    answer:
      'Click "Log in to your account" and then select "Forgot Password" on the login page. You\'ll receive a reset link at your registered company email address.',
  },
  {
    question: 'First time logging in?',
    answer:
      'Click "Create a new account" and use your company email (@sninternational.com) to register. Your manager will approve your account within 24 hours.',
  },
  {
    question: 'Who can I contact for technical issues?',
    answer:
      'Reach out to the IT Support team at support@sninternational.com or visit the Contact page. For urgent issues, call the IT helpdesk during business hours.',
  },
  {
    question: 'Can I access the portal on my phone?',
    answer:
      'Yes! SN Connect is fully responsive and works on any modern browser. A dedicated mobile app is coming soon.',
  },
];

function FAQItem({
  item,
  isOpen,
  onToggle,
}: {
  item: { question: string; answer: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-zinc-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-zinc-900 transition-colors hover:text-amber-600"
      >
        {item.question}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed text-zinc-500">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PortalFAQ(): ReactNode {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-6 shadow-card">
      {FAQ_ITEMS.map((item, i) => (
        <FAQItem
          key={item.question}
          item={item}
          isOpen={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </div>
  );
}
