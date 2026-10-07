import { logActivity } from '@/lib/audit';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import type { PropertyClient, PropertyRegister } from '@/lib/finance/properties';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const entrySchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('property'),
    name: z.string().trim().min(1).max(180),
    propertyType: z.string().trim().min(1).max(100),
    tenantName: z.string().trim().max(180).nullable(),
    occupancy: z.enum(['occupied', 'vacant']),
    weeklyRentAud: z.number().nonnegative().max(1e9).multipleOf(0.01),
    dueDay: z.number().int().min(1).max(28),
  }),
  z.object({
    kind: z.literal('rent'),
    propertyId: z.string().uuid(),
    month: monthSchema,
    receivedOn: z.string().date(),
    amountAud: z.number().positive().max(1e9).multipleOf(0.01),
    reference: z.string().trim().max(255).nullable(),
  }),
  z.object({
    kind: z.literal('maintenance'),
    propertyId: z.string().uuid(),
    jobDate: z.string().date(),
    description: z.string().trim().min(1).max(500),
    contractor: z.string().trim().max(180).nullable(),
    costAud: z.number().nonnegative().max(1e9).multipleOf(0.01),
    invoiceReference: z.string().trim().max(255).nullable(),
    status: z.enum(['scheduled', 'awaiting_invoice', 'paid']),
  }),
]);

function propertyDb(admin: unknown): PropertyClient {
  return admin as PropertyClient;
}

export async function GET(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const month = monthSchema.safeParse(request.nextUrl.searchParams.get('month'));
  if (!month.success) return NextResponse.json({ error: 'Month must be YYYY-MM' }, { status: 400 });
  const end = new Date(`${month.data}-01T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const db = propertyDb(context.admin);
  const [properties, payments, maintenance] = await Promise.all([
    db
      .from('finance_properties')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .limit(501),
    db
      .from('finance_property_rent_payments')
      .select('*', { count: 'exact' })
      .eq('period_month', `${month.data}-01`)
      .order('received_on', { ascending: false })
      .limit(5001),
    db
      .from('finance_property_maintenance')
      .select('*', { count: 'exact' })
      .gte('job_date', `${month.data}-01`)
      .lt('job_date', end.toISOString().slice(0, 10))
      .order('job_date', { ascending: false })
      .limit(5001),
  ]);
  if (properties.error || payments.error || maintenance.error)
    return NextResponse.json({ error: 'Could not load property register' }, { status: 500 });
  if (properties.count === null || payments.count === null || maintenance.count === null)
    return NextResponse.json({ error: 'Could not count property records' }, { status: 500 });
  if (properties.count > 500 || payments.count > 5000 || maintenance.count > 5000)
    return NextResponse.json(
      {
        error:
          'Property register exceeds the current view limit; narrow the data before continuing',
      },
      { status: 413 }
    );
  if (
    !properties.data ||
    !payments.data ||
    !maintenance.data ||
    properties.data.length !== properties.count ||
    payments.data.length !== payments.count ||
    maintenance.data.length !== maintenance.count
  )
    return NextResponse.json(
      { error: 'Property register results are incomplete' },
      { status: 500 }
    );
  const statusEvents = maintenance.data.length
    ? await db
        .from('finance_property_maintenance_status_events')
        .select('*', { count: 'exact' })
        .in(
          'maintenance_id',
          maintenance.data.map((job) => job.id)
        )
        .order('changed_at', { ascending: false })
        .limit(5001)
    : { data: [], count: 0, error: null };
  if (statusEvents.error || statusEvents.count === null || !statusEvents.data)
    return NextResponse.json({ error: 'Could not load maintenance history' }, { status: 500 });
  if (statusEvents.count > 5000)
    return NextResponse.json(
      { error: 'Maintenance history exceeds the current view limit' },
      { status: 413 }
    );
  if (statusEvents.data.length !== statusEvents.count)
    return NextResponse.json(
      { error: 'Maintenance history results are incomplete' },
      { status: 500 }
    );
  const register: PropertyRegister = {
    properties: properties.data,
    payments: payments.data,
    maintenance: maintenance.data,
    statusEvents: statusEvents.data,
  };
  return NextResponse.json(
    { data: register },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export async function POST(request: NextRequest) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = entrySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid property record' }, { status: 400 });
  const entry = parsed.data;
  const db = propertyDb(context.admin);
  if (entry.kind !== 'property') {
    const found = await db
      .from('finance_properties')
      .select('id')
      .eq('id', entry.propertyId)
      .maybeSingle();
    if (found.error)
      return NextResponse.json({ error: 'Could not check property' }, { status: 500 });
    if (!found.data) return NextResponse.json({ error: 'Property not found' }, { status: 404 });
  }
  if (entry.kind === 'property') {
    const { data, error } = await db
      .from('finance_properties')
      .insert({
        name: entry.name,
        property_type: entry.propertyType,
        tenant_name: entry.tenantName,
        occupancy: entry.occupancy,
        weekly_rent_aud: entry.weeklyRentAud,
        due_day: entry.dueDay,
        created_by: context.user.id,
      })
      .select('*')
      .single();
    if (error || !data)
      return NextResponse.json({ error: 'Could not add property' }, { status: 500 });
    logActivity(context.admin, {
      userId: context.user.id,
      action: 'finance_property_create',
      tableName: 'finance_properties',
      recordId: data.id,
    });
    return NextResponse.json({ data }, { status: 201 });
  }
  if (entry.kind === 'rent') {
    const { data, error } = await db
      .from('finance_property_rent_payments')
      .insert({
        property_id: entry.propertyId,
        period_month: `${entry.month}-01`,
        received_on: entry.receivedOn,
        amount_aud: entry.amountAud,
        reference: entry.reference,
        created_by: context.user.id,
      })
      .select('*')
      .single();
    if (error || !data)
      return NextResponse.json({ error: 'Could not record rent' }, { status: 500 });
    logActivity(context.admin, {
      userId: context.user.id,
      action: 'finance_rent_create',
      tableName: 'finance_property_rent_payments',
      recordId: data.id,
    });
    return NextResponse.json({ data }, { status: 201 });
  }
  const { data, error } = await db
    .from('finance_property_maintenance')
    .insert({
      property_id: entry.propertyId,
      job_date: entry.jobDate,
      description: entry.description,
      contractor: entry.contractor,
      cost_aud: entry.costAud,
      invoice_reference: entry.invoiceReference,
      status: entry.status,
      created_by: context.user.id,
    })
    .select('*')
    .single();
  if (error || !data)
    return NextResponse.json({ error: 'Could not log maintenance' }, { status: 500 });
  logActivity(context.admin, {
    userId: context.user.id,
    action: 'finance_maintenance_create',
    tableName: 'finance_property_maintenance',
    recordId: data.id,
  });
  return NextResponse.json({ data }, { status: 201 });
}
