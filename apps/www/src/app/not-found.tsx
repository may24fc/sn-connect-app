import type { ReactNode } from 'react';
import Link from 'next/link';

export default function NotFound(): ReactNode {
  return (
    <section className="flex min-h-[70vh] items-center justify-center bg-white">
      <div className="section-max section-padding text-center">
        <p className="text-7xl font-bold text-indigo-600">404</p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-3 text-base text-zinc-500">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Go home
          </Link>
          <Link
            href="/contact"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Contact us
          </Link>
        </div>
      </div>
    </section>
  );
}
