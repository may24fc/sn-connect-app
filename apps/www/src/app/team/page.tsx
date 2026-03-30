import type { Metadata } from 'next';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { ExecutivePortraits } from '@/components/team/ExecutivePortraits';
import { TeamGrid } from '@/components/team/TeamGrid';
import { OpenRolesTeaser } from '@/components/team/OpenRolesTeaser';
import { HIDE_EXPANSION_SECTIONS } from '@/lib/site-config';

// Staff poster imports (bundled by webpack)
import stevenPoster from '@/assets/staff-posters/Steven.png';
import mayPoster from '@/assets/staff-posters/May.png';
import andreaPoster from '@/assets/staff-posters/Andrea.png';
import arianaPoster from '@/assets/staff-posters/Ariana.png';
import camillePoster from '@/assets/staff-posters/Camille.png';
import biancaPoster from '@/assets/staff-posters/Bianca.png';
import ljPoster from '@/assets/staff-posters/LJ.png';
import patrickPoster from '@/assets/staff-posters/Patrick.png';
import jcPoster from '@/assets/staff-posters/JC.png';

// Intern poster imports (bundled by webpack)
import tinaPoster from '@/assets/intern-posters/Tina.png';
import arishaPoster from '@/assets/intern-posters/Arisha.png';
import emanuelaPoster from '@/assets/intern-posters/Emanuela.png';
import enricoPoster from '@/assets/intern-posters/Enrico.png';
import ceferinoPoster from '@/assets/intern-posters/Ceferino.png';
import kazzPoster from '@/assets/intern-posters/Kazz.png';
import naimaPoster from '@/assets/intern-posters/Naima.png';
import franzPoster from '@/assets/intern-posters/Franz.png';
import normanPoster from '@/assets/intern-posters/Norman.png';

export const metadata: Metadata = {
  title: 'Meet the Team',
  description:
    'Meet the leadership and team behind SN International Group and the support services we deliver.',
};

const EXECUTIVES = [
  {
    name: 'Steven Nhan',
    title: 'Chief Executive Officer',
    image: stevenPoster,
  },
  {
    name: 'May Layugan',
    title: 'Chief Operating Officer',
    image: mayPoster,
  },
];

const STAFF_MEMBERS = [
  {
    name: 'Andrea Visitacion',
    title: 'Executive Assistant to CEO',
    image: andreaPoster,
  },
  {
    name: 'Ariana Ricardo',
    title: 'Personal Assistant to CEO',
    image: arianaPoster,
  },
  {
    name: 'Camille "Cams" Buquir',
    title: 'HR Manager',
    image: camillePoster,
  },
  {
    name: 'Bianca Ragadio',
    title: 'Google Ads Specialist',
    image: biancaPoster,
  },
  {
    name: 'Lolita Jonquil "LJ" Cruz',
    title: 'Meta Ads Specialist',
    image: ljPoster,
  },
  {
    name: 'Patrick Mongaya',
    title: 'Multimedia Specialist',
    image: patrickPoster,
  },
  {
    name: 'John Christian Tulio',
    title: 'Digital Content Designer',
    image: jcPoster,
  }
];

const INTERN_MEMBERS = [
  {
    name: 'Tina Olavia',
    title: 'Admin Assistant Intern',
    image: tinaPoster,
  },
  {
    name: 'Arisha Bablani',
    title: 'HR SOP & Policy Development Intern',
    image: arishaPoster,
  },
  {
    name: 'Emanuela Saldi',
    title: 'Marketing Intern',
    image: emanuelaPoster,
  },
  {
    name: 'Enrico Miguel Buhisan',
    title: 'Video Editor Intern',
    image: enricoPoster,
  },
  {
    name: 'Ceferino Jumao-as V',
    title: 'Senior AI Specialist Intern',
    image: ceferinoPoster,
  },
  {
    name: 'Kazz Virtudez',
    title: 'AI Specialist Intern',
    image: kazzPoster,
  },
  {
    name: 'Naima Tasnia',
    title: 'AI Specialist Intern',
    image: naimaPoster,
  },
  {
    name: 'Franz Ivan De Villa',
    title: 'AI Specialist Intern',
    image: franzPoster,
  },
  {
    name: 'Norman Jazul Jr.',
    title: 'AI Specialist Intern',
    image: normanPoster,
  }
];

export default function TeamPage() {
  const totalSupportTeam = STAFF_MEMBERS.length + INTERN_MEMBERS.length;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(96,153,172,0.22),transparent_32%),linear-gradient(180deg,#f7fbfc_0%,#ffffff_72%)] py-24 sm:py-28">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400 to-transparent" />
        <div className="section-max section-padding">
          <div className="mx-auto max-w-5xl text-center">
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl lg:leading-[1.04]">
              Meet the team building reliable support behind <span className="text-primary-800">SN International</span>.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base text-zinc-600 sm:text-lg">
              Leadership, specialists, and interns working across executive support, marketing, content, operations, and AI-driven workflow delivery.
            </p>

            <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-[0_16px_40px_rgba(23,80,99,0.08)]">
                <p className="text-3xl font-bold text-zinc-950">{EXECUTIVES.length}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-800">Executive leaders</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Setting direction, standards, and the operating cadence behind the business.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-[0_16px_40px_rgba(23,80,99,0.08)]">
                <p className="text-3xl font-bold text-zinc-950">{STAFF_MEMBERS.length}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-800">Core staff</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">Specialists supporting creative output, administration, HR, and day-to-day execution.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-[0_16px_40px_rgba(23,80,99,0.08)]">
                <p className="text-3xl font-bold text-zinc-950">{totalSupportTeam}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary-800">Visible team members</p>
                <p className="mt-2 text-sm leading-6 text-zinc-600">A cross-functional group contributing to delivery quality, documentation, and workflow support.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Executive Leadership */}
      <section className="bg-white py-20 lg:py-24">
        <div className="section-max section-padding">
          <ScrollReveal>
            <SectionHeading
              title="Executive Leadership"
              subtitle="Our senior leadership team sets the strategic direction and culture of the organization."
            />
          </ScrollReveal>
          <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.18)] sm:p-8 lg:p-10">
            <ExecutivePortraits executives={EXECUTIVES} />
          </div>
        </div>
      </section>

      {/* Staffs & Interns */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-zinc-50 to-primary-50/40 py-20 lg:py-24">
        <div className="section-max section-padding">
          <ScrollReveal>
            <SectionHeading
              title="Staff and Intern Team"
              subtitle="Meet the staff and interns behind the daily work, creative output, and operational momentum across the organization."
            />
          </ScrollReveal>
          <div className="mt-6 rounded-[2rem] border border-zinc-200/80 bg-white/80 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8 lg:p-10">
            <TeamGrid
              staffMembers={STAFF_MEMBERS}
              internMembers={INTERN_MEMBERS}
            />
          </div>
        </div>
      </section>


      {!HIDE_EXPANSION_SECTIONS && (
        <section className="bg-zinc-50 py-20 lg:py-24">
          <div className="section-max section-padding">
            <ScrollReveal>
              <SectionHeading
                title="Open Positions"
                subtitle="We're hiring across all business units. Find your role and grow with us."
              />
            </ScrollReveal>
            <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.14)] sm:p-8 lg:p-10">
              <OpenRolesTeaser />
            </div>
          </div>
        </section>
      )}
    </>
  );
}
