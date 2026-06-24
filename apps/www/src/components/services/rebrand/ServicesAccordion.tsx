'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

const ease = [0.19, 1, 0.22, 1] as const;

const line = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 1.0, ease } },
};

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease } },
};

const stagger = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: delay } },
});

const services = [
  {
    id: 'ai-engineering',
    number: '01.',
    name: 'AI Engineering',
    description:
      'Custom AI solutions designed to automate workflows, streamline operations, and create measurable business impact. From AI applications and websites to intelligent automations and system integrations, we build solutions tailored to your business.',
    supporting:
      'Custom AI Development · Workflow Automation · AI Agents · System Integrations · Internal Tools · Web Applications',
    metrics: [
      { value: 'End-to-End', label: 'Delivery Model' },
      { value: 'Custom Built', label: 'For Your Business' },
    ],
  },
  {
    id: 'ai-talent-placement',
    number: '02.',
    name: 'AI Talent Placement',
    description:
      'Access pre-vetted AI Engineers, AI Specialists, Automation Experts, and Technical Talent ready to support projects, augment teams, or lead AI initiatives.',
    supporting:
      'AI Engineers · Automation Specialists · AI Operations Talent · Technical Screening · Contract and Permanent Placement',
    metrics: [
      { value: 'Contract / Full-Time', label: 'Engagement Models' },
      { value: 'Global Talent', label: 'Candidate Network' },
    ],
  },
  {
    id: 'ai-automation',
    number: '03.',
    name: 'AI Automation',
    description:
      'Eliminate repetitive work through intelligent automation. We connect your systems, automate processes, and deploy AI-powered workflows that save time and increase productivity.',
    supporting:
      'CRM Automation · Email Intelligence · Process Automation · Data Workflows · Reporting Automation · Business Operations',
    metrics: [
      { value: 'Operations', label: 'Focus Area' },
      { value: 'Fast Deployment', label: 'Implementation' },
    ],
  },
  {
    id: 'ai-strategy',
    number: '04.',
    name: 'AI Strategy & Consulting',
    description:
      'Identify where AI can create the most value in your business. We help leaders evaluate opportunities, design implementation roadmaps, and prioritize practical AI initiatives.',
    supporting:
      'AI Readiness Assessment · Process Analysis · Technology Selection · Change Management · AI Adoption Strategy',
    metrics: [
      { value: 'Leadership Teams', label: 'Ideal Fit' },
      { value: 'Growth Focused', label: 'Business Outcomes' },
    ],
  },
];

function ServiceItem({ service, index }: { service: (typeof services)[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div variants={fade}>
      {index > 0 && <div className="w-full h-px bg-[#0c1d2e]/10" />}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group w-full flex items-center gap-6 py-8 md:py-10 text-left"
        aria-expanded={open}
      >
        <span
          className="font-sans font-normal text-7xl text-[#0c1d2e]/30 tracking-[-0.04em] leading-[1.1] shrink-0"
          aria-hidden
        >
          {service.number}
        </span>

        <div className="flex-1 overflow-hidden pb-[0.18em]">
          <motion.span
            className="block font-sans font-normal text-7xl text-[#0c1d2e] tracking-[-0.04em] leading-[1.1]"
            variants={line}
          >
            {service.name}
          </motion.span>
        </div>

        <span className="shrink-0 w-12 h-12 flex items-center justify-center text-[#0c1d2e]/40 group-hover:text-[#0c1d2e] transition-colors duration-300">
          <motion.svg
            width="28"
            height="28"
            viewBox="0 0 16 16"
            fill="none"
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <path
              d="M8 1v14M1 8h14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </motion.svg>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-8 md:gap-0 pb-10 md:pb-14">
              <div className="flex flex-row md:flex-col gap-8 md:gap-6 md:pr-8">
                {service.metrics.map((m) => (
                  <div key={m.label} className="flex flex-col gap-1">
                    <span className="font-normal text-4xl text-[#0c1d2e] tracking-[-0.04em] leading-tight">
                      {m.value}
                    </span>
                    <span className="button-mono text-xs font-medium text-[#0c1d2e]/45 uppercase tracking-[0.18em]">
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-6">
                <p
                  className="text-base md:text-lg text-[#0c1d2e]/70 tracking-[-0.02em]"
                  style={{ lineHeight: '1.55' }}
                >
                  {service.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {service.supporting.split('·').map((tag) => (
                    <span
                      key={tag.trim()}
                      className="inline-flex items-center py-1 px-3 rounded-sm bg-white gap-2 button-mono text-sm font-medium text-[#0c1d2e] uppercase tracking-[0.2em]"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ServicesAccordion() {
  return (
    <section
      className="relative w-full bg-[#d6e4f0] overflow-hidden rounded-b-[2rem]
                 px-6 sm:px-10 md:px-12 lg:px-16
                 pt-16 md:pt-24"
      id="services-list"
      aria-label="Our services"
    >
      {/* Section label — matches VisionSection sidebar chip */}
      <motion.div
        variants={stagger()}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="mb-12 md:mb-16"
      >
        <motion.div
          variants={fade}
          className="inline-flex items-center py-1 pl-2 pr-3 rounded-sm bg-[#ffffff] gap-2"
        >
          <span className="w-[10px] h-[10px] bg-[#3b86d2] flex-shrink-0" />
          <span className="button-mono text-sm font-medium text-[#0c1d2e] uppercase tracking-[0.2em]">
            What We Offer
          </span>
        </motion.div>
      </motion.div>

      {/* Accordion list — stagger container matching VisionSection body pattern */}
      <motion.div
        className="pb-16 md:pb-24"
        variants={stagger()}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        {services.map((service, i) => (
          <ServiceItem key={service.id} service={service} index={i} />
        ))}
        <div className="w-full h-px bg-[#0c1d2e]/10" />
      </motion.div>
    </section>
  );
}
