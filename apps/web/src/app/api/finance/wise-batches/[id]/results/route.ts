import { getFinanceContext } from '@/lib/finance/auth';
import { csvObjects } from '@/lib/finance/csv';
import { getTransferStatus } from '@/lib/wise/client';
import { NextResponse, type NextRequest } from 'next/server';

type BatchItem = { id: string; payment_reference: string; recipient_id: string; amount: number; source_currency: string; target_currency: string; status: string };
function column(row: Record<string, string>, ...names: string[]): string {
  const key = Object.keys(row).find((candidate) => names.some((name) => candidate.toLowerCase().replace(/[^a-z]/g, '') === name.toLowerCase().replace(/[^a-z]/g, '')));
  return key ? row[key] ?? '' : '';
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.capabilities.isLeadership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
  const raw = await request.text();
  if (raw.length > 1_000_000) return NextResponse.json({ error: 'Results file is too large' }, { status: 413 });
  let rows: Array<Record<string, string>>;
  try { rows = csvObjects(raw); } catch { return NextResponse.json({ error: 'Invalid CSV results' }, { status: 400 }); }
  if (rows.length < 1 || rows.length > 1000) return NextResponse.json({ error: 'Results must contain 1 to 1000 transfers' }, { status: 400 });
  const db = context.admin as any;
  const { data: items, error } = await db.from('wise_batch_items').select('id,payment_reference,recipient_id,amount,source_currency,target_currency,status').eq('batch_id', id);
  if (error || !items?.length) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  const byReference = new Map((items as BatchItem[]).map((item) => [item.payment_reference, item]));
  const results: Array<{ reference: string; transferId: string; result: 'completed'|'unmatched'|'failed'|'duplicate'; detail: string }> = [];
  for (const row of rows) {
    const reference = column(row, 'paymentReference', 'reference');
    const transferId = column(row, 'transferId', 'wiseTransferId', 'id');
    const item = byReference.get(reference);
    let result: 'completed'|'unmatched'|'failed'|'duplicate' = 'unmatched';
    let detail = 'No matching batch item or transfer ID';
    if (item?.status === 'completed') { result = 'duplicate'; detail = 'Invoice was already paid'; }
    else if (item && /^\d+$/.test(transferId)) {
      try {
        const transfer = await getTransferStatus(Number(transferId));
        const matches = transfer.reference === reference && transfer.targetAccount === Number(item.recipient_id)
          && transfer.sourceCurrency === item.source_currency && transfer.targetCurrency === item.target_currency
          && Math.abs(Number(transfer.sourceValue) - Number(item.amount)) < 0.01;
        if (matches && transfer.status === 'outgoing_payment_sent') {
          const confirmed = await db.rpc('confirm_finance_wise_transfer', { item_id: item.id, transfer_id: transferId });
          result = confirmed.data === true && !confirmed.error ? 'completed' : 'duplicate';
          detail = result === 'completed' ? 'Verified against Wise transfer' : 'Invoice state changed before confirmation';
          if (result === 'completed') item.status = 'completed';
        } else { result = matches ? 'failed' : 'unmatched'; detail = matches ? `Wise transfer is ${transfer.status}` : 'Wise transfer details do not match invoice'; }
      } catch { result = 'failed'; detail = 'Wise transfer could not be verified'; }
    }
    results.push({ reference, transferId, result, detail });
    await db.from('wise_batch_import_rows').insert({ batch_id: id, payment_reference: reference || null, wise_transfer_id: transferId || null, transfer_status: column(row, 'status') || 'unknown', result, detail, imported_by: context.user.id });
  }
  const completed = (items as BatchItem[]).filter((item) => item.status === 'completed').length;
  await db.from('wise_batches').update({ status: completed === items.length ? 'completed' : completed > 0 ? 'partial' : 'exported', updated_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ data: { results, completed, total: items.length } });
}
