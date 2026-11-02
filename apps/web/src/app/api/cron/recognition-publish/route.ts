import {
  manilaDate,
  publishRecognitionPeriod,
  recognitionPeriodForMonday,
} from '@/lib/recognition';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return !secret || request.headers.get('authorization') === `Bearer ${secret}`;
}
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const periodKey = recognitionPeriodForMonday(manilaDate());
    const admin = createSupabaseAdminClient();
    const { data: period } = await admin
      .from('recognition_periods')
      .select('*')
      .eq('period_type', periodKey.periodType)
      .eq('period_start', periodKey.periodStart)
      .eq('period_end', periodKey.periodEnd)
      .maybeSingle();
    if (!period) return NextResponse.json({ skipped: true, reason: 'No recognition period' });
    if (period.status !== 'approved') {
      if (period.status === 'draft') {
        await admin
          .from('recognition_periods')
          .update({
            status: 'skipped',
            last_error: 'Not approved by the scheduled publication time',
          })
          .eq('id', period.id)
          .eq('status', 'draft');
      }
      return NextResponse.json({ skipped: true, reason: 'Period was not approved' });
    }
    return NextResponse.json({ data: await publishRecognitionPeriod(period.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publication failed' },
      { status: 500 }
    );
  }
}
