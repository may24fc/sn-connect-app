'use client';

import { motion } from 'framer-motion';
import { Cpu, FileText, Flag, Settings2, Users, Workflow } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { ChromaFlow, FlutedGlass, Shader, Swirl } from 'shaders/react';

const ease = [0.19, 1, 0.22, 1] as const;

const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.85, ease } },
};

const stagger = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: delay } },
});

type StoryChapter = {
  number: string;
  title: string;
  body: ReactNode;
  visual: 'milestone' | 'balance' | 'systems';
};

const highlightClass = 'font-medium text-[#3b86d2]';

const chapters: Array<StoryChapter> = [
  {
    number: '01',
    title: 'Built from experience',
    body: (
      <>
        SN Group started from years of first-hand experience building and running businesses. Over
        more than two decades, our Founder and CEO,{' '}
        <strong className={highlightClass}>Steven Nhan</strong>, saw both the opportunities
        technology could create and the everyday challenges businesses face behind the scenes. As AI
        and automation began changing the way people work, he saw an opportunity to do more than
        simply introduce new tools—to build businesses where technology could remove repetitive
        work, improve efficiency, and give people more time to focus on what truly matters.
      </>
    ),
    visual: 'milestone',
  },
  {
    number: '02',
    title: 'Technology, backed by operations',
    body: (
      <>
        That idea came together with the operational experience of our COO,{' '}
        <strong className={highlightClass}>May Layugan</strong>. While Steven focuses on what
        technology can make possible, May turns those possibilities into practical systems that work
        in the real world. Together, they began testing these ideas within the businesses they
        operate—improving workflows, introducing automation, building better systems, and finding
        the right people to support them. Through that process, they learned that the best solution
        is rarely technology alone. It is about finding the right balance between{' '}
        <strong className={highlightClass}>people, processes, and technology</strong>.
      </>
    ),
    visual: 'balance',
  },
  {
    number: '03',
    title: 'How we work today',
    body: (
      <>
        That experience became the foundation of SN Group today. We begin by understanding how a
        business works, where time is being lost, and what is getting in the way of growth. From
        there, we build practical solutions using AI, automation, better systems, and capable people
        where they make the most impact. Our goal is simple:{' '}
        <strong className={highlightClass}>
          make businesses easier to run and give founders and their teams more time to think, lead,
          grow, and focus on the work that matters most.
        </strong>
      </>
    ),
    visual: 'systems',
  },
];

function MilestoneVisual() {
  return (
    <div className="relative mx-auto h-44 w-full max-w-[320px]" aria-hidden>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 176" fill="none">
        <title>Decorative milestone path</title>
        <path
          d="M28 148C76 146 65 104 112 105C163 106 151 56 204 58C247 59 248 25 289 25"
          stroke="rgba(59,134,210,0.55)"
          strokeWidth="2"
          strokeDasharray="5 7"
        />
      </svg>
      {[
        ['left-[6%]', 'bottom-[9%]'],
        ['left-[32%]', 'bottom-[35%]'],
        ['left-[61%]', 'bottom-[62%]'],
      ].map(([left, bottom]) => (
        <span
          key={left}
          className={`absolute ${left} ${bottom} h-4 w-4 rounded-full border-2 border-[#3b86d2] bg-[#eaf2f9] shadow-[0_0_16px_rgba(59,134,210,0.7)]`}
        />
      ))}
      <div className="absolute right-[4%] top-0 flex h-12 w-12 items-center justify-center rounded-full border border-[#3b86d2]/35 bg-white/65 text-[#3b86d2] shadow-[0_12px_35px_rgba(59,134,210,0.18)]">
        <Flag size={23} strokeWidth={1.6} />
      </div>
    </div>
  );
}

function BalanceVisual() {
  const items = [
    { label: 'People', Icon: Users, position: 'left-1/2 top-0 -translate-x-1/2' },
    { label: 'Process', Icon: Settings2, position: 'bottom-0 left-[8%]' },
    { label: 'Technology', Icon: Cpu, position: 'bottom-0 right-[2%]' },
  ];

  return (
    <div className="relative mx-auto h-52 w-full max-w-[330px]" aria-hidden>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 330 208" fill="none">
        <title>Decorative people, process, and technology connection</title>
        <path
          d="M165 43L70 168H260L165 43Z"
          stroke="rgba(59,134,210,0.45)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
      </svg>
      {items.map(({ label, Icon, position }) => (
        <div key={label} className={`absolute ${position} flex flex-col items-center gap-2`}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#3b86d2]/40 bg-white/70 text-[#3b86d2] shadow-[0_12px_32px_rgba(59,134,210,0.16)] backdrop-blur-sm">
            <Icon size={28} strokeWidth={1.5} />
          </span>
          <span className="button-mono text-[10px] uppercase tracking-[0.13em] text-[#0c1d2e]/55">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function SystemsVisual() {
  const items = [
    { name: 'AI', Icon: Cpu },
    { name: 'Workflow', Icon: Workflow },
    { name: 'Systems', Icon: FileText },
    { name: 'People', Icon: Users },
  ];

  return (
    <div
      className="relative mx-auto flex h-48 w-full max-w-[340px] items-center justify-center"
      aria-hidden
    >
      <div className="absolute bottom-4 h-16 w-[92%] rounded-[50%] border border-[#3b86d2]/25" />
      <div className="absolute bottom-7 h-11 w-[74%] rounded-[50%] border border-[#3b86d2]/20" />
      <div className="relative flex items-center -space-x-3 [perspective:700px]">
        {items.map(({ name, Icon }, index) => (
          <div
            key={name}
            className="relative flex h-28 w-20 items-center justify-center rounded-lg border border-[#3b86d2]/45 bg-white/55 text-[#3b86d2] shadow-[0_16px_32px_rgba(59,134,210,0.14)] backdrop-blur-md sm:h-32 sm:w-24"
            style={{
              transform: `translateY(${index % 2 === 0 ? -8 : 8}px) rotateY(-12deg)`,
              zIndex: items.length - index,
            }}
          >
            <div className="absolute inset-2 rounded border border-[#3b86d2]/10" />
            <Icon size={30} strokeWidth={1.45} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StoryVisual({ visual }: { visual: StoryChapter['visual'] }) {
  if (visual === 'milestone') return <MilestoneVisual />;
  if (visual === 'balance') return <BalanceVisual />;
  return <SystemsVisual />;
}

export default function OurStorySection() {
  return (
    <section
      className="relative w-full bg-[#d6e4f0] px-4 pb-6 text-[#0c1d2e] md:px-6 md:pb-8"
      id="our-story-section"
      aria-labelledby="our-story-heading"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-[#0c1d2e]/10 bg-white/35">
        <div className="relative grid min-h-[610px] overflow-hidden bg-[#0c1d2e] lg:min-h-[560px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="absolute inset-0 z-0" aria-hidden>
            <Shader style={{ width: '100%', height: '100%' }}>
              <Swirl colorA="#0c1d2e" colorB="#1b3b5a" detail={1.7} />
              <ChromaFlow
                baseColor="#0c1d2e"
                downColor="#1b3b5a"
                leftColor="#2b5a8c"
                rightColor="#1b3b5a"
                upColor="#0c1d2e"
                momentum={13}
                radius={3.5}
              />
              <FlutedGlass
                aberration={0.61}
                angle={31}
                frequency={8}
                highlight={0.08}
                highlightSoftness={0}
                lightAngle={-90}
                refraction={4}
                shape="rounded"
                softness={1}
                speed={0.15}
              />
            </Shader>
          </div>

          <motion.div
            className="relative z-10 min-h-[300px] overflow-hidden sm:min-h-[380px] lg:min-h-full"
            initial={{ opacity: 0, scale: 1.035 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.1, ease }}
          >
            <Image
              src="/steven-speech.png"
              alt="Steven Nhan speaking on stage"
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-[63%_center]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,29,46,0.04)_28%,rgba(12,29,46,0.92)_100%)] lg:bg-[linear-gradient(90deg,rgba(12,29,46,0.04)_35%,rgba(12,29,46,0.42)_67%,#0c1d2e_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_44%,rgba(59,134,210,0.08),transparent_40%)]" />
          </motion.div>

          <motion.div
            className="relative z-20 flex flex-col justify-center px-7 pb-14 pt-5 sm:px-10 lg:-ml-px lg:px-12 lg:py-20 xl:px-16"
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.div variants={fade} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 bg-[#3b86d2]" />
              <span className="button-mono text-xs font-medium uppercase tracking-[0.22em] text-[#79b9f8] sm:text-sm">
                Our Story
              </span>
              <span className="h-px w-10 bg-[#3b86d2]/70" />
            </motion.div>
            <motion.h2
              variants={fade}
              className="mt-8 max-w-xl text-[2rem] font-normal leading-[1.08] tracking-[-0.045em] text-white sm:text-5xl lg:text-[54px]"
              id="our-story-heading"
            >
              Built by operators. Powered by technology.{' '}
              <span className="text-[#4d9bea]">Designed to give businesses their time back.</span>
            </motion.h2>
          </motion.div>

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(121,185,248,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(121,185,248,0.16) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'linear-gradient(135deg, black, transparent 68%)',
              WebkitMaskImage: 'linear-gradient(135deg, black, transparent 68%)',
            }}
            aria-hidden
          />
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage: 'radial-gradient(rgba(12,29,46,0.08) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse 80% 70% at 85% 50%, black 10%, transparent 75%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 80% 70% at 85% 50%, black 10%, transparent 75%)',
            }}
            aria-hidden
          />
          {chapters.map((chapter, index) => (
            <motion.article
              key={chapter.number}
              className="relative grid grid-cols-1 gap-6 border-t border-[#0c1d2e]/10 px-6 py-12 sm:px-8 md:grid-cols-[88px_minmax(0,1fr)] md:gap-x-7 md:px-10 md:py-16 lg:grid-cols-[88px_minmax(0,1.25fr)_minmax(260px,0.75fr)] lg:items-center lg:gap-x-10 xl:px-14"
              variants={stagger(index * 0.03)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-70px' }}
            >
              <motion.div variants={fade} className="md:self-start">
                <span className="block text-5xl font-normal leading-none tracking-[-0.05em] text-[#0c1d2e]/20 md:text-[64px]">
                  {chapter.number}
                </span>
                <span className="mt-4 block h-0.5 w-12 bg-[#3b86d2]" />
              </motion.div>

              <motion.div variants={fade} className="max-w-3xl md:pt-1">
                <h3 className="text-2xl font-normal leading-tight tracking-[-0.035em] text-[#0c1d2e] sm:text-3xl">
                  {chapter.title}
                </h3>
                <p className="mt-5 text-base leading-[1.75] tracking-[-0.015em] text-[#0c1d2e]/68 sm:text-lg">
                  {chapter.body}
                </p>
              </motion.div>

              <motion.div
                variants={fade}
                className="mt-2 border-t border-[#0c1d2e]/10 pt-8 md:col-start-2 lg:col-start-3 lg:mt-0 lg:border-l lg:border-t-0 lg:py-4 lg:pl-8"
              >
                <StoryVisual visual={chapter.visual} />
              </motion.div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
