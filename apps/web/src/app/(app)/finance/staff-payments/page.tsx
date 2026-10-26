import AdminInvoicePage from '@/app/(app)/(admin)/admin/invoice/page';
import PayrollApprovalsPage from '@/app/(app)/(admin)/super-admin/payroll-approvals/page';
import { FinanceDetailDisclosure } from '@/components/finance/FinanceDetailDisclosure';
import { FinancePaymentWorkspace } from '@/components/finance/FinancePaymentWorkspace';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { Button, PageTitle } from '@hr-portal/ui';
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
    <main className="h-full space-y-6">
      <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageTitle>
            Staff Payments
          </PageTitle>
          <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
            Approve invoices, create a Wise batch, and verify completed transfers before marking
            Paid.
          </p>
        </div>
        <Button asChild>
          <Link href="/invoice">My invoices</Link>
        </Button>
      </header>
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
          <FinancePaymentWorkspace queueKey={`${counts[0]?.count}-${counts[1]?.count}`} />
          <FinanceDetailDisclosure title="Open employee invoice administration">
            <AdminInvoicePage />
          </FinanceDetailDisclosure>
          <FinanceDetailDisclosure title="Open detailed approval history">
            <PayrollApprovalsPage />
          </FinanceDetailDisclosure>
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
