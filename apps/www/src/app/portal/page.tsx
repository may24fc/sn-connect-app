import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SN Connect Portal — Login & Sign Up',
  description:
    'Access SN Connect HR Portal. Login or sign up to manage your account.',
};

const PORTAL_URL = process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3001';

export default function PortalPage(): ReactNode {
  return (
    <section className="min-h-[80vh] bg-white py-20">
      <div className="section-max section-padding">
        {/* Header */}
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
              SN
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            SN Connect Portal
          </h1>
          <p className="mt-2 text-base text-zinc-500">
            Access your HR dashboard, files, tasks, and performance reviews.
          </p>
        </div>

        {/* Actions */}
        <div className="mx-auto mt-10 flex max-w-sm flex-col gap-3">
          <a
            href={`${PORTAL_URL}/login`}
            className="flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Log in to your account
          </a>
          <a
            href={`${PORTAL_URL}/signup`}
            className="flex items-center justify-center rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Create a new account
          </a>
        </div>

        {/* Help */}
        <div className="mt-8 text-center">
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
      </div>
    </section>
  );
}
