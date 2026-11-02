import {
  handleTelegramCommunityUpdate,
  type TelegramCommunityUpdate,
} from '@/lib/telegram-community-webhook';
import { NextResponse } from 'next/server';

function authorizeCommunityWebhook(secretHeader: string | null) {
  const expectedSecret = process.env.TELEGRAM_COMMUNITY_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) return { ok: false as const, status: 503 };
  if (secretHeader !== expectedSecret) return { ok: false as const, status: 401 };
  return { ok: true as const };
}

export async function POST(request: Request) {
  const authorization = authorizeCommunityWebhook(
    request.headers.get('x-telegram-bot-api-secret-token')
  );
  if (!authorization.ok) {
    return NextResponse.json(
      {
        error:
          authorization.status === 503
            ? 'Telegram Community webhook is not configured'
            : 'Invalid webhook secret',
      },
      { status: authorization.status }
    );
  }

  try {
    const update = (await request.json()) as TelegramCommunityUpdate;
    await handleTelegramCommunityUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Community] Webhook processing failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
