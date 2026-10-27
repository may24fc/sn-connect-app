import { requestUhpVolumePointsTelegramUpdate } from '@/lib/uhp-volume-points-manual-send';
import { NextResponse } from 'next/server';
import { requireUhpModule } from '../../_lib';

export async function POST() {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const result = await requestUhpVolumePointsTelegramUpdate({
    requestedBy: auth.context.userId,
    source: 'control_hub_button',
  });
  if (!result.ok && result.reason === 'not_configured') {
    return NextResponse.json(
      { error: 'Manual Telegram delivery is not configured' },
      { status: 503 }
    );
  }
  if (!result.ok) {
    return NextResponse.json({ error: 'Telegram delivery could not be started' }, { status: 502 });
  }

  return NextResponse.json({ data: { accepted: true } });
}
