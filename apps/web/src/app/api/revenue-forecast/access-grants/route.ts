import {
  getRevenueForecastAuthedContext,
  isRevenueForecastAdmin,
  listRevenueForecastAccessGrants,
} from '@/app/api/revenue-forecast/_lib';
import { logActivity } from '@/lib/audit';
import { revenueForecastGrantSchema } from '@/lib/schemas/revenue-forecast.schema';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

function isMarketingOrFinanceDepartment(value: string | null | undefined): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.includes('marketing') || normalized.includes('finance');
}

export async function GET() {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isRevenueForecastAdmin(auth.context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: await listRevenueForecastAccessGrants() });
  } catch (error) {
    console.error('Unexpected error in GET /api/revenue-forecast/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isRevenueForecastAdmin(auth.context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = revenueForecastGrantSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { userId } = parsed.data;

    const { data: targetUser, error: targetUserError } = await admin
      .from('users')
      .select('id, role, deleted_at')
      .eq('id', userId)
      .maybeSingle();

    if (targetUserError) {
      console.error('Failed to load Revenue Forecast grant target user:', targetUserError);
      return NextResponse.json({ error: 'Failed to validate user' }, { status: 500 });
    }

    if (!targetUser || targetUser.deleted_at) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['employee', 'associate'].includes(targetUser.role)) {
      return NextResponse.json(
        { error: 'Only employee or associate users can receive Revenue Forecast grants' },
        { status: 400 }
      );
    }

    const { data: employee, error: employeeError } = await admin
      .from('employees')
      .select('department')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (employeeError) {
      console.error('Failed to validate Revenue Forecast department eligibility:', employeeError);
      return NextResponse.json({ error: 'Failed to validate user department' }, { status: 500 });
    }

    if (!isMarketingOrFinanceDepartment(employee?.department ?? null)) {
      return NextResponse.json(
        {
          error:
            'Only Marketing or Finance employee/associate users can receive Revenue Forecast access',
        },
        { status: 400 }
      );
    }

    const { data: existingGrant } = await admin
      .from('revenue_forecast_access_grants')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingGrant?.id) {
      return NextResponse.json(
        { error: 'Revenue Forecast access is already granted for this user' },
        { status: 409 }
      );
    }

    const { data: insertedGrant, error: insertError } = await admin
      .from('revenue_forecast_access_grants')
      .insert({
        user_id: userId,
        granted_by: auth.context.user.id,
        access_level: 'full',
      })
      .select('id')
      .single();

    if (insertError || !insertedGrant) {
      console.error('Failed to create Revenue Forecast access grant:', insertError);
      return NextResponse.json(
        { error: 'Failed to create Revenue Forecast access grant' },
        { status: 500 }
      );
    }

    logActivity(admin, {
      userId: auth.context.user.id,
      action: 'grant_revenue_forecast_access',
      tableName: 'revenue_forecast_access_grants',
      recordId: insertedGrant.id,
      metadata: { grantedUserId: userId },
    });

    return NextResponse.json({ data: await listRevenueForecastAccessGrants() }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/revenue-forecast/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getRevenueForecastAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!isRevenueForecastAdmin(auth.context.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = revenueForecastGrantSchema.safeParse(await request.json().catch(() => ({})));
    const userId = parsed.success ? parsed.data.userId : request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const deletedAt = new Date().toISOString();

    const { data: grant, error: revokeError } = await admin
      .from('revenue_forecast_access_grants')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id')
      .single();

    if (revokeError || !grant) {
      console.error('Failed to revoke Revenue Forecast access grant:', revokeError);
      return NextResponse.json(
        { error: 'Failed to revoke Revenue Forecast access grant' },
        { status: 500 }
      );
    }

    logActivity(admin, {
      userId: auth.context.user.id,
      action: 'revoke_revenue_forecast_access',
      tableName: 'revenue_forecast_access_grants',
      recordId: grant.id,
      metadata: { revokedUserId: userId },
    });

    return NextResponse.json({ data: await listRevenueForecastAccessGrants() });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/revenue-forecast/access-grants:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
