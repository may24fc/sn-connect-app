const MANUAL_SEND_TIMEOUT_MS = 15_000;

export type UhpVolumePointsManualSendSource = 'control_hub_button' | 'telegram_command';

export type UhpVolumePointsManualSendResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'delivery_failed' };

export async function requestUhpVolumePointsTelegramUpdate(input: {
  requestedBy: string;
  source: UhpVolumePointsManualSendSource;
}): Promise<UhpVolumePointsManualSendResult> {
  const webhookUrl = process.env.N8N_UHP_VOLUME_POINTS_WEBHOOK_URL?.trim();
  const callbackSecret = process.env.N8N_CALLBACK_SECRET?.trim();
  if (!(webhookUrl && callbackSecret)) return { ok: false, reason: 'not_configured' };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-control-hub-n8n-secret': callbackSecret,
      },
      body: JSON.stringify({
        requestedAt: new Date().toISOString(),
        requestedBy: input.requestedBy,
        source: input.source,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(MANUAL_SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[n8n] UHP Volume Points manual webhook returned ${response.status} ${response.statusText}`
      );
      return { ok: false, reason: 'delivery_failed' };
    }

    return { ok: true };
  } catch (error) {
    console.error('[n8n] Failed to start UHP Volume Points manual delivery:', error);
    return { ok: false, reason: 'delivery_failed' };
  }
}
