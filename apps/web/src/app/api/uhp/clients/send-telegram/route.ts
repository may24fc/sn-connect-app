import { NextResponse } from 'next/server';
import { requireUhpModule } from '../../_lib';

export async function POST() {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const webhookUrl = process.env.N8N_UHP_OUTREACH_WEBHOOK_URL?.trim();
  const secret = process.env.N8N_CALLBACK_SECRET?.trim();
  if (!(webhookUrl && secret)) {
    return NextResponse.json(
      { error: 'Manual Telegram delivery is not configured' },
      { status: 503 }
    );
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-control-hub-n8n-secret': secret },
      body: JSON.stringify({
        requestedAt: new Date().toISOString(),
        requestedBy: auth.context.userId,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`n8n returned ${response.status}`);
    return NextResponse.json({ data: { accepted: true } });
  } catch (error) {
    console.error('[n8n] Failed to start UHP Outreach manual delivery:', error);
    return NextResponse.json({ error: 'Telegram delivery could not be started' }, { status: 502 });
  }
}
