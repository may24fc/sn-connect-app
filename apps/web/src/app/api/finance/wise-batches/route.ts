import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createSchema = z.object({
  invoiceIds: z
    .array(z.string().uuid())
    .min(1)
    .max(1000)
    .refine((ids) => new Set(ids).size === ids.length),
});

export async function GET() {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = context.admin as any;
  const [invoices, batches] = await Promise.all([
    db
      .from('invoices')
      .select(
        'id, invoice_number, employee_id, net_amount, source_currency, target_currency, status, employee:employees(first_name,last_name)'
      )
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('approved_at', { ascending: false })
      .limit(1000),
    db
      .from('wise_batches')
      .select(
        'id,status,created_at,items:wise_batch_items(id,invoice_id,payment_reference,status,wise_transfer_id),import_rows:wise_batch_import_rows(id,payment_reference,wise_transfer_id,result,detail,imported_at)'
      )
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  if (invoices.error || batches.error)
    return NextResponse.json({ error: 'Could not load payment queue' }, { status: 500 });
  const ids = (invoices.data ?? []).map((row: { id: string }) => row.id);
  const employeeIds = [
    ...new Set((invoices.data ?? []).map((row: { employee_id: string }) => row.employee_id)),
  ] as string[];
  const [oldPayments, batchItems, banking] = ids.length
    ? await Promise.all([
        db.from('wise_payments').select('invoice_id,payment_status').in('invoice_id', ids),
        db.from('wise_batch_items').select('invoice_id').in('invoice_id', ids),
        db
          .from('employee_banking_info')
          .select('employee_id,wise_recipient_id,is_verified')
          .in('employee_id', employeeIds)
          .is('deleted_at', null),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (oldPayments.error || batchItems.error || banking.error)
    return NextResponse.json({ error: 'Could not check existing payments' }, { status: 500 });
  const unavailable = new Set(
    [...(oldPayments.data ?? []), ...(batchItems.data ?? [])].map(
      (row: { invoice_id: string }) => row.invoice_id
    )
  );
  const bankByEmployee = new Map(
    (banking.data ?? []).map((row: { employee_id: string }) => [row.employee_id, row])
  );
  return NextResponse.json({
    data: {
      ready: (invoices.data ?? []).map(
        (invoice: {
          id: string;
          employee_id: string;
          net_amount: number;
          source_currency: string | null;
          target_currency: string | null;
        }) => {
          const bank = bankByEmployee.get(invoice.employee_id) as
            | { wise_recipient_id?: string; is_verified?: boolean }
            | undefined;
          return {
            ...invoice,
            eligible:
              !unavailable.has(invoice.id) &&
              Number(invoice.net_amount) > 0 &&
              Boolean(
                invoice.source_currency &&
                  invoice.target_currency &&
                  bank?.wise_recipient_id &&
                  bank.is_verified
              ),
          };
        }
      ),
      batches: batches.data ?? [],
    },
  });
}

export async function POST(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.capabilities.isLeadership)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid invoice selection' }, { status: 400 });
  const { data, error } = await (context.admin as any).rpc('create_finance_wise_batch', {
    invoice_ids: parsed.data.invoiceIds,
    actor_id: context.user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ data: { id: data } }, { status: 201 });
}
