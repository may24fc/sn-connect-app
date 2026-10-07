import { getFinanceContext } from '@/lib/finance/auth';
import { parseCsv, writeCsv } from '@/lib/finance/csv';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.capabilities.isLeadership)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: 'Invalid batch ID' }, { status: 400 });
  const input = await request.text();
  if (input.length > 1_000_000)
    return NextResponse.json({ error: 'Template is too large' }, { status: 413 });
  let template: string[][];
  try {
    template = parseCsv(input);
  } catch {
    return NextResponse.json({ error: 'Invalid CSV template' }, { status: 400 });
  }
  const [header, ...rows] = template;
  if (!header) return NextResponse.json({ error: 'Empty CSV template' }, { status: 400 });
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const indexOf = (name: string) =>
    header.findIndex((column) => normalize(column) === normalize(name));
  const recipientIndex = indexOf('recipientId');
  const required = [
    'recipientDetail',
    'recipientType',
    'sourceCurrency',
    'targetCurrency',
    'amount',
    'amountCurrency',
  ];
  const referenceIndex =
    indexOf('paymentReference') >= 0 ? indexOf('paymentReference') : indexOf('reference');
  if (recipientIndex < 0 || referenceIndex < 0 || required.some((key) => indexOf(key) < 0)) {
    return NextResponse.json(
      {
        error:
          'Upload the saved-recipient CSV template downloaded from Wise, including a payment reference column',
      },
      { status: 400 }
    );
  }
  const db = context.admin as any;
  const { data: items, error } = await db
    .from('wise_batch_items')
    .select('id,recipient_id,payment_reference,amount,source_currency,target_currency')
    .eq('batch_id', id)
    .order('payment_reference');
  if (error || !items?.length)
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  const byRecipient = new Map<string, string[]>();
  const duplicateRecipients = new Set<string>();
  for (const row of rows) {
    const recipientId = row[recipientIndex]?.trim();
    if (!recipientId) continue;
    if (byRecipient.has(recipientId)) duplicateRecipients.add(recipientId);
    byRecipient.set(recipientId, row);
  }
  const output: string[][] = [header];
  for (const item of items as Array<{
    recipient_id: string;
    payment_reference: string;
    amount: number;
    source_currency: string;
    target_currency: string;
  }>) {
    if (duplicateRecipients.has(item.recipient_id))
      return NextResponse.json(
        { error: `Wise template has multiple saved recipients ${item.recipient_id}` },
        { status: 400 }
      );
    const templateRow = byRecipient.get(item.recipient_id);
    if (!templateRow)
      return NextResponse.json(
        { error: `Wise template has no saved recipient ${item.recipient_id}` },
        { status: 400 }
      );
    const row = [...templateRow];
    row[indexOf('sourceCurrency')] = item.source_currency;
    row[indexOf('targetCurrency')] = item.target_currency;
    row[indexOf('amount')] = Number(item.amount).toFixed(2);
    row[indexOf('amountCurrency')] = item.source_currency;
    row[referenceIndex] = item.payment_reference;
    output.push(row);
  }
  return new NextResponse(writeCsv(output), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="wise-batch-${id}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
