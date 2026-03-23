import type { Metadata } from 'next';
import { COMPANY } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { ExecutivePortraits } from '@/components/team/ExecutivePortraits';
import { TeamGrid } from '@/components/team/TeamGrid';
import { CountUpStats } from '@/components/team/CountUpStats';
import { OpenRolesTeaser } from '@/components/team/OpenRolesTeaser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Meet the Team',
  description:
    'Meet the leadership and people behind SN International Group. Our team drives innovation across all business units.',
};

async function getOpenRolesCount(): Promise<number> {
  try {
    const supabase = createSupabaseServerClient();
    const { count } = await supabase
      .from('job_postings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('deleted_at', null);
    return count ?? 0;
  } catch {
    return 0;
  }
}

const EXECUTIVES = [
  {
    name: 'Alfonso Natividad',
    title: 'Chief Executive Officer',
    bio: 'Visionary leader with 20+ years of experience building diversified businesses across the Philippines. Drives the strategic direction and culture of SN International Group.',
    email: 'ceo@sninternational.com',
    image:
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Patricia Reyes',
    title: 'Chief Operating Officer',
    bio: 'Operational excellence expert overseeing day-to-day operations across all four business units. Focused on efficiency, quality, and continuous improvement.',
    email: 'coo@sninternational.com',
    image:
      'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=600&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Marco Villanueva',
    title: 'Chief Financial Officer',
    bio: 'Financial strategist ensuring sustainable growth, profitability, and sound fiscal management across the group.',
    email: 'cfo@sninternational.com',
    image:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Camille Soriano',
    title: 'Chief Human Resources Officer',
    bio: 'People-first leader driving talent acquisition, employee development, and the culture that makes SN International a top employer.',
    email: 'chro@sninternational.com',
    image:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=80&auto=format&fit=crop&crop=faces',
  },
];

const TEAM_MEMBERS = [
  {
    name: 'Benito Castillo',
    title: 'Director of Operations',
    department: 'SFO',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Angelica Mendoza',
    title: 'Head of Sales',
    department: 'UHP',
    image:
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Rafael Dizon',
    title: 'Club Manager',
    department: '24 Fit Club',
    image:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Teresa Bautista',
    title: 'Project Director',
    department: 'SN Construction',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Enrique Salazar',
    title: 'Marketing Manager',
    department: 'Corporate',
    image:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Danielle Aquino',
    title: 'IT Manager',
    department: 'Corporate',
    image:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Carlos Manalo',
    title: 'Quality Assurance Lead',
    department: 'SFO',
    image:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80&auto=format&fit=crop&crop=faces',
  },
  {
    name: 'Vivian Tan',
    title: 'Supply Chain Manager',
    department: 'UHP',
    image:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80&auto=format&fit=crop&crop=faces',
  },
];

export default async function TeamPage() {
  const openRolesCount = await getOpenRolesCount();

  const TEAM_STATS = [
    { value: 500, suffix: '+', label: 'Team Members' },
    { value: 4, suffix: '', label: 'Business Units' },
    { value: 15, suffix: '+', label: 'Years of Experience' },
    { value: openRolesCount, suffix: '', label: 'Open Positions' },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-white py-24">
        <div className="section-max section-padding text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Meet the <span className="text-amber-600">Team</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            The people driving innovation, excellence, and impact at {COMPANY.name}.
          </p>
        </div>
      </section>

      {/* Executive Leadership */}
      <section className="bg-white py-20">
        <div className="section-max section-padding">
          <ScrollReveal>
            <SectionHeading
              title="Executive Leadership"
              subtitle="Our senior leadership team sets the strategic direction and culture of the organization."
            />
          </ScrollReveal>
          <div className="mt-10">
            <ExecutivePortraits executives={EXECUTIVES} />
          </div>
        </div>
      </section>

      {/* Management Team */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-zinc-50 to-amber-50/30 py-20">
        <div className="section-max section-padding">
          <ScrollReveal>
            <SectionHeading
              title="Management & Directors"
              subtitle="The leaders who drive operations across every business unit."
            />
          </ScrollReveal>
          <div className="mt-10">
            <TeamGrid members={TEAM_MEMBERS} />
          </div>
        </div>
      </section>

      {/* Team stats */}
      <section className="relative overflow-hidden py-16">
        {/* Dot matrix background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #0F172A 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="section-max section-padding relative">
          <CountUpStats stats={TEAM_STATS} />
        </div>
      </section>

      {/* Open Positions */}
      <section className="bg-zinc-50 py-20">
        <div className="section-max section-padding">
          <ScrollReveal>
            <SectionHeading
              title="Open Positions"
              subtitle="We're hiring across all business units. Find your role and grow with us."
            />
          </ScrollReveal>
          <div className="mt-10">
            <OpenRolesTeaser />
          </div>
        </div>
      </section>
    </>
  );
}
