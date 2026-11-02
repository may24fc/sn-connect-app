function getTelegramBotToken(variable: 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_COMMUNITY_BOT_TOKEN') {
  const token = process.env[variable]?.trim();
  return token || null;
}

export interface SendTelegramMessageInput {
  chatId: string;
  text: string;
  messageThreadId?: number;
  replyToMessageId?: number;
}

async function sendTelegramMessageWithToken(
  { chatId, text, messageThreadId, replyToMessageId }: SendTelegramMessageInput,
  tokenVariable: 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_COMMUNITY_BOT_TOKEN'
): Promise<{ sent: boolean; messageId?: number; error?: string }> {
  const token = getTelegramBotToken(tokenVariable);

  if (!token) {
    return { sent: false, error: `${tokenVariable} is not configured` };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
        ...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
        ...(replyToMessageId
          ? {
              reply_parameters: { message_id: replyToMessageId, allow_sending_without_reply: true },
            }
          : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Telegram] Failed to send message:', response.status, errorText);
      return { sent: false, error: errorText || `Telegram request failed with ${response.status}` };
    }

    const payload = (await response.json()) as { result?: { message_id?: number } };
    return payload.result?.message_id
      ? { sent: true, messageId: payload.result.message_id }
      : { sent: true };
  } catch (error) {
    console.error('[Telegram] Unexpected error sending message:', error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown Telegram send error',
    };
  }
}

export async function sendTelegramMessage({
  chatId,
  text,
  messageThreadId,
  replyToMessageId,
}: SendTelegramMessageInput): Promise<{ sent: boolean; messageId?: number; error?: string }> {
  return sendTelegramMessageWithToken(
    {
      chatId,
      text,
      ...(messageThreadId ? { messageThreadId } : {}),
      ...(replyToMessageId ? { replyToMessageId } : {}),
    },
    'TELEGRAM_BOT_TOKEN'
  );
}

export async function sendCommunityTelegramMessage(
  input: SendTelegramMessageInput
): Promise<{ sent: boolean; messageId?: number; error?: string }> {
  return sendTelegramMessageWithToken(input, 'TELEGRAM_COMMUNITY_BOT_TOKEN');
}
