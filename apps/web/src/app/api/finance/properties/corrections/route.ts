import { logActivity } from '@/lib/audit';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const status = z.enum(['scheduled', 'awaiting_invoice', 'paid']);
const correction = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('rent_void'),
    id: z.string().uuid(),
    reason: z.string().trim().min(10).max(500),
  }),
  z.object({
    kind: z.literal('maintenance_status'),
    id: z.string().uuid(),
    expectedStatus: status,
    status,
  }),
]);

type CorrectionRpc = {
  rpc: (
    name: 'void_finance_rent_payment' | 'update_finance_maintenance_status',
    args: Record<string, string>
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
};

export async function PATCH(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = correction.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid property correction' }, { status: 400 });
  const input = parsed.data;
  if (input.kind === 'maintenance_status' && input.expectedStatus === input.status)
    return NextResponse.json({ error: 'Choose a different status' }, { status: 400 });
  const db = context.admin as unknown as CorrectionRpc;
  const result =
    input.kind === 'rent_void'
      ? await db.rpc('void_finance_rent_payment', {
          payment_id: input.id,
          actor_id: context.user.id,
          correction_reason: input.reason,
        })
      : await db.rpc('update_finance_maintenance_status', {
          job_id: input.id,
          actor_id: context.user.id,
          expected_status: input.expectedStatus,
          next_status: input.status,
        });
  if (result.error || result.data === null)
    return NextResponse.json({ error: 'Could not save property correction' }, { status: 500 });
  if (!result.data)
    return NextResponse.json(
      { error: 'Record already corrected or status changed; refresh the register' },
      { status: 409 }
    );
  logActivity(context.admin, {
    userId: context.user.id,
    action: input.kind === 'rent_void' ? 'finance_rent_void' : 'finance_maintenance_status_update',
    tableName:
      input.kind === 'rent_void'
        ? 'finance_property_rent_payments'
        : 'finance_property_maintenance',
    recordId: input.id,
  });
  return NextResponse.json({ data: { id: input.id, kind: input.kind } });
}
