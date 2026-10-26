import { NextResponse } from 'next/server';
import { isUhpAdmin, requireUhpModule } from '../../_lib';

const MANUAL_SEND_TIMEOUT_MS = 15_000;

export async function POST() {
  const auth = await requireUhpModule('volume_points');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!isUhpAdmin(auth.context.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const webhookUrl = process.env.N8N_UHP_VOLUME_POINTS_WEBHOOK_URL?.trim();
  const callbackSecret = process.env.N8N_CALLBACK_SECRET?.trim();
  if (!(webhookUrl && callbackSecret)) {
    return NextResponse.json(
      { error: 'Manual Telegram delivery is not configured' },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-control-hub-n8n-secret': callbackSecret,
      },
      body: JSON.stringify({
        requestedAt: new Date().toISOString(),
        requestedBy: auth.context.userId,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(MANUAL_SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[n8n] UHP Volume Points manual webhook returned ${response.status} ${response.statusText}`
      );
      return NextResponse.json(
        { error: 'Telegram delivery could not be started' },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: { accepted: true } });
  } catch (error) {
    console.error('[n8n] Failed to start UHP Volume Points manual delivery:', error);
    return NextResponse.json({ error: 'Telegram delivery could not be started' }, { status: 502 });
  }
}
