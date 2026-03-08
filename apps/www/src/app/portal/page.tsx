import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  FileText,
  BarChart3,
  CheckSquare,
  CreditCard,
  Shield,
  Users,
} from 'lucide-react';
import { PortalFAQ } from '@/components/portal/PortalFAQ';

export const metadata: Metadata = {
  title: 'SN Connect Portal — Login & Sign Up',
  description:
    'Access SN Connect HR Portal. Login or sign up to manage your account.',
};

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3001';

const FEATURES = [
  { icon: CreditCard, title: 'View Pay Slips', description: 'Access your salary records and payroll history anytime.' },
  { icon: FileText, title: 'Submit Reports', description: 'File daily, weekly, and monthly reports in one place.' },
  { icon: CheckSquare, title: 'Track Tasks', description: 'Manage assignments, deadlines, and progress updates.' },
  { icon: BarChart3, title: 'Performance Reviews', description: 'View OKRs, KPIs, and review feedback from managers.' },
  { icon: Users, title: 'Employee Directory', description: 'Find colleagues, departments, and contact information.' },
  { icon: Shield, title: 'Secure 201 Files', description: 'Access personal documents and records safely.' },
];

export default function PortalPage(): ReactNode {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 py-20">
        {/* Decorative grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Radial glow */}
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />

        <div className="section-max section-padding relative">
          <div className="mx-auto max-w-lg text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white ring-1 ring-white/20 backdrop-blur-sm">
                SN
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              SN Connect Portal
            </h1>
            <p className="mt-3 text-base text-indigo-100">
              Your centralized HR dashboard — access files, tasks, performance reviews, and more.
            </p>

            {/* Actions */}
            <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
              <a
                href={`${PORTAL_URL}/login`}
                className="flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-medium text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 hover:shadow-md"
              >
                Log in to your account
              </a>
              <a
                href={`${PORTAL_URL}/signup`}
                className="flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Create a new account
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature preview cards */}
      <section className="bg-white py-16">
        <div className="section-max section-padding">
          <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Everything you need, in one place
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-zinc-500">
            SN Connect gives employees and managers the tools to stay organized, informed, and productive.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-zinc-100 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-mega"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 transition-colors duration-200 group-hover:bg-zinc-900 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-zinc-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-zinc-50 py-14">
        <div className="section-max section-padding">
          <div className="mx-auto max-w-2xl text-center">
            <blockquote className="text-lg font-medium italic text-zinc-700">
              &ldquo;SN Connect made my daily work so much easier. I can track my tasks, view
              my pay slips, and submit reports all from one dashboard — no more digging through
              emails.&rdquo;
            </blockquote>
            <div className="mt-4">
              <p className="text-sm font-semibold text-zinc-900">Angelica Mendoza</p>
              <p className="text-xs text-zinc-500">Operations Coordinator, SFO</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16">
        <div className="section-max section-padding">
          <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-900">
            Quick Help
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-zinc-500">
            Common questions about accessing the portal.
          </p>
          <div className="mx-auto mt-8 max-w-2xl">
            <PortalFAQ />
          </div>
        </div>
      </section>

      {/* Help */}
      <section className="border-t border-zinc-100 bg-white py-8">
        <div className="section-max section-padding text-center">
          <p className="text-sm text-zinc-400">
            Need help accessing your account?{' '}
            <Link
              href="/contact"
              className="text-indigo-600 transition-colors hover:text-indigo-700"
            >
              Contact IT Support
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
