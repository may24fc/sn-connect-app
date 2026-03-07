import type { Metadata } from 'next';
import { COMPANY } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { ExecutivePortraits } from '@/components/team/ExecutivePortraits';
import { TeamGrid } from '@/components/team/TeamGrid';

export const metadata: Metadata = {
  title: 'Meet the Team',
  description:
    'Meet the leadership and people behind SN International Group. Our team drives innovation across all business units.',
};

const EXECUTIVES = [
  {
    name: 'CEO Name',
    title: 'Chief Executive Officer',
    bio: 'Visionary leader with 20+ years of experience building diversified businesses across the Philippines. Drives the strategic direction and culture of SN International Group.',
    linkedin: '#',
    email: 'ceo@sninternational.com',
  },
  {
    name: 'COO Name',
    title: 'Chief Operating Officer',
    bio: 'Operational excellence expert overseeing day-to-day operations across all four business units. Focused on efficiency, quality, and continuous improvement.',
    linkedin: '#',
    email: 'coo@sninternational.com',
  },
  {
    name: 'CFO Name',
    title: 'Chief Financial Officer',
    bio: 'Financial strategist ensuring sustainable growth, profitability, and sound fiscal management across the group.',
    linkedin: '#',
    email: 'cfo@sninternational.com',
  },
  {
    name: 'CHRO Name',
    title: 'Chief Human Resources Officer',
    bio: 'People-first leader driving talent acquisition, employee development, and the culture that makes SN International a top employer.',
    linkedin: '#',
    email: 'chro@sninternational.com',
  },
];

const TEAM_MEMBERS = [
  { name: 'Director 1', title: 'Director of Operations', department: 'SFO' },
  { name: 'Director 2', title: 'Head of Sales', department: 'UHP' },
  { name: 'Director 3', title: 'Club Manager', department: '24 Fit Club' },
  { name: 'Director 4', title: 'Project Director', department: 'SN Construction' },
  { name: 'Manager 1', title: 'Marketing Manager', department: 'Corporate' },
  { name: 'Manager 2', title: 'IT Manager', department: 'Corporate' },
  { name: 'Manager 3', title: 'Quality Assurance Lead', department: 'SFO' },
  { name: 'Manager 4', title: 'Supply Chain Manager', department: 'UHP' },
];

export default function TeamPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white py-24">
        <div className="section-max section-padding text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Meet the <span className="text-indigo-600">Team</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            The people driving innovation, excellence, and impact at {COMPANY.name}.
          </p>
        </div>
      </section>

      {/* Executive Leadership */}
      <section className="section-max section-padding py-16">
        <ScrollReveal>
          <SectionHeading
            title="Executive Leadership"
            subtitle="Our senior leadership team sets the strategic direction and culture of the organization."
          />
        </ScrollReveal>
        <div className="mt-10">
          <ExecutivePortraits executives={EXECUTIVES} />
        </div>
      </section>

      {/* Management Team */}
      <section className="bg-zinc-50 py-16">
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
      <section className="section-max section-padding py-16">
        <ScrollReveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: '500+', label: 'Team Members' },
              { value: '4', label: 'Business Units' },
              { value: '15+', label: 'Years of Experience' },
              { value: '20+', label: 'Industry Awards' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-card"
              >
                <p className="text-4xl font-bold text-indigo-600">{stat.value}</p>
                <p className="mt-2 text-sm font-medium text-zinc-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
