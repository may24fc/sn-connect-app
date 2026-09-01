import Link from 'next/link';

export default function AccountDisabledPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <section className="w-full rounded-xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900/40 dark:bg-zinc-900">
        <span className="inline-flex rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
          Account Disabled
        </span>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          This account is currently disabled
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Your account has been marked as inactive or terminated. Access to associate and employee
          tools is blocked until an administrator restores your account.
        </p>

        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          If this is unexpected, please contact HR or your administrator for reactivation.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Back to Login
          </Link>
        </div>
      </section>
    </main>
  );
}
