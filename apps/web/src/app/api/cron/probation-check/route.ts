import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader === '1') {
    return true;
  }

  const configuredSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!configuredSecret || !authHeader) {
    return false;
  }

  return authHeader === `Bearer ${configuredSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin.functions.invoke('probation-check', {
      body: { source: 'next-cron' },
    });

    if (error) {
      console.error('[cron/probation-check] Failed to invoke edge function:', error);
      return NextResponse.json({ error: 'Failed to run probation check' }, { status: 502 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[cron/probation-check] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
