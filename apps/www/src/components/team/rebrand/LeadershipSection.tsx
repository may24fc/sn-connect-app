'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const ease = [0.19, 1, 0.22, 1] as const;

const line = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 1.0, ease } },
};

const fade = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.9, ease } },
};

const stagger = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: delay } },
});

const leaders = [
  {
    name: 'Steven Nhan',
    title: 'Chief Executive Officer',
    bio: 'Founder and visionary behind SN International Group, driving strategy and growth across the business.',
    image: '/staff-images/Steven Nhan.png',
  },
  {
    name: 'May Layugan',
    title: 'Chief Operating Officer',
    bio: 'Oversees daily operations and ensures the organization runs with precision and efficiency.',
    image: '/staff-images/May Layugan.png',
  },
];


function LeaderCard({
  leader,
  delay,
}: {
  leader: (typeof leaders)[0];
  delay: number;
}) {
  return (
    <motion.div variants={fade} custom={delay} className="group flex flex-col bg-white rounded-[1.5rem] overflow-hidden">
      {/* Portrait — inset with padding, image has its own rounded corners */}
      <div className="p-3 pb-0">
        <div className="relative w-full aspect-[3/4] md:aspect-[4/3] overflow-hidden rounded-[0.85rem] bg-[#e8f0f8]">
          <Image
            src={leader.image}
            alt={leader.name}
            fill
            className="object-cover object-top"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      </div>

      {/* Details */}
      <div className="px-5 pt-4 pb-6 flex flex-col gap-1">
        <p className="font-sans font-normal text-2xl text-[#0c1d2e] tracking-[-0.03em] leading-tight">
          {leader.name}
        </p>
        <p className="button-mono text-xs font-medium text-[#0c1d2e]/45 uppercase tracking-[0.18em]">
          {leader.title}
        </p>
        <p
          className="mt-2 text-sm text-[#0c1d2e]/50 tracking-[-0.01em]"
          style={{ lineHeight: '1.5' }}
        >
          {leader.bio}
        </p>
      </div>
    </motion.div>
  );
}

export default function LeadershipSection() {
  return (
    <section
      className="relative w-full bg-[#d6e4f0] text-[#0c1d2e] overflow-hidden"
      id="leadership-section"
    >
      <div className="w-full px-6 md:px-[4.5rem] lg:px-[5.5rem] pt-4 md:pt-8 pb-16 md:pb-[124px]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-10 md:gap-0">
          {/* ── Left: label + body ── */}
          <aside className="md:pr-8 pt-0 md:pt-12">
            <motion.div
              variants={stagger()}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="flex flex-col gap-5"
            >
              <motion.div
                variants={fade}
                className="inline-flex items-center py-1 pl-2 pr-3 rounded-sm bg-white gap-2 w-fit"
              >
                <span className="w-[10px] h-[10px] bg-[#3b86d2] flex-shrink-0" />
                <span className="button-mono text-sm font-medium text-[#0c1d2e] uppercase tracking-[0.2em]">
                  Leadership
                </span>
              </motion.div>

              <div className="overflow-hidden">
                <motion.p
                  variants={line}
                  className="text-3xl sm:text-4xl md:text-[42px] font-normal leading-tight tracking-tight text-[#0c1d2e] font-sans"
                >
                  Executive
                </motion.p>
              </div>

              <motion.p
                variants={fade}
                className="text-base md:text-lg font-medium sm:font-normal text-[#0c1d2e]/65 tracking-[-0.04em]"
                style={{ lineHeight: '1.35' }}
              >
                Our leadership team sets the strategic direction, operating culture, and delivery standards behind everything we build.
              </motion.p>
            </motion.div>
          </aside>

          {/* ── Right: portrait cards ── */}
          <motion.div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 md:pt-12"
            variants={stagger(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {leaders.map((leader, i) => (
              <LeaderCard key={leader.name} leader={leader} delay={0.1 + i * 0.1} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
