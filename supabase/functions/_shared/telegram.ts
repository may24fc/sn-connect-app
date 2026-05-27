import { env } from './env.ts';

export interface SendTelegramMessageInput {
  chatId: string;
  text: string;
}

export async function sendTelegramMessage({
  chatId,
  text,
}: SendTelegramMessageInput): Promise<{ sent: boolean; error?: string }> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();

  if (!token) {
    return { sent: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[telegram] Failed to send message:', response.status, errorText);
      return { sent: false, error: errorText || `Telegram request failed with ${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error('[telegram] Unexpected error sending message:', error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown Telegram send error',
    };
  }
}