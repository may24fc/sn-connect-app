import type { createSupabaseAdminClient } from '@/lib/supabase/server';

const PAGE_SIZE = 1000;
const MAX_ROWS = 10_000;

export async function completeFinanceRows<T>(
  makePage: (
    start: number,
    end: number
  ) => PromiseLike<{
    data: Array<T> | null;
    count: number | null;
    error: { message: string } | null;
  }>
): Promise<Array<T>> {
  const rows: Array<T> = [];
  while (rows.length <= MAX_ROWS) {
    const page = await makePage(rows.length, rows.length + PAGE_SIZE - 1);
    if (page.error || page.count === null)
      throw new Error('Could not load complete Finance report pack');
    if (page.count > MAX_ROWS) throw new Error('Finance report pack exceeds 10,000 source rows');
    rows.push(...(page.data ?? []));
    if (rows.length === page.count) return rows;
    if (!page.data?.length || rows.length > page.count)
      throw new Error('Finance report pack source read was incomplete');
  }
  throw new Error('Finance report pack exceeds 10,000 source rows');
}

type Subscription = {
  id: string;
  vendor_name: string;
  active: boolean;
  payment_source: string;
  monthly_amount_aud: number | null;
  seats: number | null;
  next_renewal: string | null;
};
type Charge = { subscription_id: string; last_charged: string };
type WiseRow = {
  payment_reference: string | null;
  result: string;
  detail: string | null;
  imported_at: string;
  resolved_at: string | null;
};

export async function buildFinanceReportPackSupplement(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  month: string
) {
  const db = admin as any;
  const start = `${month}-01T00:00:00Z`;
  const next = new Date(start);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const end = next.toISOString();
  const [subscriptions, charges, wiseRows] = await Promise.all([
    completeFinanceRows<Subscription>((from, to) =>
      db
        .from('finance_subscriptions')
        .select('id,vendor_name,active,payment_source,monthly_amount_aud,seats,next_renewal', {
          count: 'exact',
        })
        .order('id')
        .range(from, to)
    ),
    completeFinanceRows<Charge>((from, to) =>
      db
        .from('finance_subscription_last_charges')
        .select('subscription_id,last_charged', { count: 'exact' })
        .order('subscription_id')
        .range(from, to)
    ),
    completeFinanceRows<WiseRow>((from, to) =>
      db
        .from('wise_batch_import_rows')
        .select('payment_reference,result,detail,imported_at,resolved_at', { count: 'exact' })
        .gte('imported_at', start)
        .lt('imported_at', end)
        .order('imported_at')
        .order('id')
        .range(from, to)
    ),
  ]);
  const lastCharge = new Map(charges.map((row) => [row.subscription_id, row.last_charged]));
  return {
    subscriptionsAsOfSnapshot: subscriptions.map((row) => ({
      ...row,
      last_charged: lastCharge.get(row.id) ?? null,
    })),
    wiseImportRowsForMonth: wiseRows,
  };
}
