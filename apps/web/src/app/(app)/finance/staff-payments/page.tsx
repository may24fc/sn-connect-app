import AdminInvoicePage from '@/app/(app)/(admin)/admin/invoice/page';
import PayrollApprovalsPage from '@/app/(app)/(admin)/super-admin/payroll-approvals/page';
import { FinanceInvoiceRegister } from '@/components/finance/FinanceInvoiceRegister';
import { FinanceWiseBatches } from '@/components/finance/FinanceWiseBatches';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const steps = [
  { title: 'Submitted', detail: 'Staff upload an invoice' },
  { title: 'Approved', detail: 'Leadership reviews the invoice' },
  { title: 'Wise batch', detail: 'Export approved, eligible invoices' },
  { title: 'Verified paid', detail: 'Import completed Wise transfers' },
];

export default async function StaffPaymentsPage() {
  const context = await getFinanceContext();
  if (!(context.ok && canReviewFinance(context.capabilities))) return notFound();
  const leadership = context.capabilities.isLeadership;
  const statuses = ['submitted', 'approved', 'paid', 'rejected'] as const;
  const counts = leadership
    ? await Promise.all(
        statuses.map((status) =>
          context.admin
            .from('invoices')
            .select('id', { count: 'exact', head: true })
            .is('deleted_at', null)
            .eq('status', status)
        )
      )
    : [];
  if (counts.some((result) => result.error))
    throw new Error('Could not load invoice status counts');

  return (
    <main className="mx-auto max-w-7xl space-y-5 bg-[#f5f6f4] p-4 text-[#10191c] md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1f6a7c]">Finance</p>
          <h1 className="text-3xl font-bold">Staff Payments</h1>
          <p className="text-sm text-muted-foreground">
            Approve invoices, create a Wise batch, and verify completed transfers before marking
            Paid.
          </p>
        </div>
        <Link
          href="/invoice"
          className="rounded-lg bg-[#16505f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1f6a7c]"
        >
          My invoices
        </Link>
      </header>
      <nav aria-label="Finance pages" className="flex flex-wrap gap-2 text-sm">
        <Link href="/finance" className="rounded-md border bg-card px-3 py-2">
          Overview
        </Link>
        <Link href="/finance/expenses" className="rounded-md border bg-card px-3 py-2">
          Expenses
        </Link>
        <Link href="/finance/reports" className="rounded-md border bg-card px-3 py-2">
          Reports
        </Link>
        <Link href="/finance/properties" className="rounded-md border bg-card px-3 py-2">
          Properties
        </Link>
      </nav>
      {leadership ? (
        <>
          <section aria-label="Invoice status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statuses.map((status, index) => (
              <div key={status} className="rounded-xl border bg-card p-5">
                <p className="text-sm capitalize text-muted-foreground">
                  {status === 'submitted'
                    ? 'Awaiting approval'
                    : status === 'approved'
                      ? 'Approved · not yet paid'
                      : status}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{counts[index]?.count ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {status === 'approved'
                    ? 'See Wise queue for eligibility'
                    : 'Invoices across all periods'}
                </p>
              </div>
            ))}
          </section>
          <section
            aria-label="Payout process"
            className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((step, index) => (
              <div key={step.title} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6f0f1] text-sm font-bold text-[#16505f]">
                  {index + 1}
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{step.title}</h2>
                  <p className="text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            ))}
          </section>
          <FinanceWiseBatches key={`${counts[0]?.count}-${counts[1]?.count}`} />
          <FinanceInvoiceRegister />
          <details className="rounded-xl border bg-card p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[#16505f]">
              Open employee invoice administration
            </summary>
            <AdminInvoicePage />
          </details>
          <details className="rounded-xl border bg-card p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[#16505f]">
              Open detailed approval history
            </summary>
            <PayrollApprovalsPage />
          </details>
        </>
      ) : (
        <section className="rounded-xl border bg-card p-5 text-sm">
          <h2 className="font-semibold">Staff invoice submission</h2>
          <p className="mt-2 text-muted-foreground">
            Invoice approval and Wise batch handling are restricted to administrators. Submit and
            track your invoices from My invoices.
          </p>
          <Link className="mt-3 inline-block font-medium text-[#16505f] underline" href="/invoice">
            Open My invoices
          </Link>
        </section>
      )}
    </main>
  );
}
