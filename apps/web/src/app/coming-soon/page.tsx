import { Construction } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function ComingSoonPage(): ReactNode {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950/50">
          <Construction className="h-8 w-8 text-slate-700 dark:text-slate-400" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
          Coming Soon
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This feature is currently under development and will be available soon.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
