import { extractProjectIntake, type IntakeExtractionResult, transcribeVoice } from '@hr-portal/ai';
import { createNotification, createNotificationsForUsers, getUserIdsByRoles } from '@/lib/notifications/create-notification';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { persistProjectIntake, type PersistIntakeResult } from './persist-intake';

export interface ProjectIntakeMessageInput {
  sourceChatId: string;
  sourceMessageId: string;
  senderUserId: string;
  text: string;
  voiceFileId?: string;
}

async function downloadTelegramFile(fileId: string): Promise<Blob> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }

  const metadataResponse = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  if (!metadataResponse.ok) {
    throw new Error(`Telegram getFile failed: ${metadataResponse.status}`);
  }

  const metadata = (await metadataResponse.json()) as {
    ok: boolean;
    result?: { file_path?: string };
  };
  const filePath = metadata.result?.file_path;
  if (!metadata.ok || !filePath) {
    throw new Error('Telegram getFile returned no file_path');
  }

  const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!fileResponse.ok) {
    throw new Error(`Telegram file download failed: ${fileResponse.status}`);
  }

  return await fileResponse.blob();
}

export async function resolveProjectIntakeMessageText({
  text,
  voiceFileId,
  sourceMessageId,
}: {
  text: string;
  voiceFileId: string | undefined;
  sourceMessageId: string;
}): Promise<string> {
  if (text && text.length > 0) {
    return text;
  }

  if (!voiceFileId) {
    throw new Error('No text and no voice file provided');
  }

  const blob = await downloadTelegramFile(voiceFileId);
  return await transcribeVoice(blob, `${sourceMessageId}.ogg`, {});
}

export async function notifyProjectIntakeAudience({
  persisted,
  extraction,
}: {
  persisted: PersistIntakeResult;
  extraction: IntakeExtractionResult;
}): Promise<void> {
  if (persisted.status === 'accepted' && persisted.assignedUserId) {
    await createNotification({
      userId: persisted.assignedUserId,
      type: 'project_assigned',
      title: `New project assigned: ${extraction.title}`,
      message: extraction.objective,
      link: persisted.projectId ? `/projects/${persisted.projectId}` : '/projects/pool',
      metadata: { backlogId: persisted.backlogId, source: 'telegram-intake' },
      sendEmail: true,
      sendTelegram: true,
    });
    return;
  }

  const recipientIds = await getUserIdsByRoles(['associate', 'employee']);
  if (recipientIds.length === 0) {
    return;
  }

  await createNotificationsForUsers(recipientIds, {
    type: 'project_claimable',
    title: `New project in the pool: ${extraction.title}`,
    message: extraction.problem_statement,
    link: '/projects/pool',
    metadata: { backlogId: persisted.backlogId, source: 'telegram-intake' },
    sendEmail: true,
    sendTelegram: true,
  });
}

export function buildProjectIntakeConfirmation({
  persisted,
  extraction,
}: {
  persisted: PersistIntakeResult;
  extraction: IntakeExtractionResult;
}): string {
  if (persisted.status === 'accepted') {
    return `Project "${extraction.title}" was assigned${extraction.assigned_name_hint ? ` to ${extraction.assigned_name_hint}` : ''}.`;
  }

  return `Project "${extraction.title}" added to the Project Pool — interns will be notified.`;
}

export async function confirmProjectIntakeOnTelegram({
  sourceChatId,
  persisted,
  extraction,
}: {
  sourceChatId: string;
  persisted: PersistIntakeResult;
  extraction: IntakeExtractionResult;
}): Promise<void> {
  await sendTelegramMessage({
    chatId: sourceChatId,
    text: buildProjectIntakeConfirmation({ persisted, extraction }),
  });
}

export async function processProjectIntakeMessage(
  input: ProjectIntakeMessageInput
): Promise<
  | { status: 'ignored'; reason: 'empty message' }
  | { status: 'ok'; backlogId: string; projectId: string | null; assigned: boolean }
> {
  const { sourceChatId, sourceMessageId, senderUserId, text, voiceFileId } = input;

  const messageText = await resolveProjectIntakeMessageText({
    text,
    voiceFileId,
    sourceMessageId,
  });

  if (!messageText || messageText.trim().length === 0) {
    return { status: 'ignored', reason: 'empty message' };
  }

  const extraction = await extractProjectIntake(messageText);
  const admin = createSupabaseAdminClient();
  const persisted = await persistProjectIntake(admin, {
    extraction,
    source: {
      chatId: sourceChatId,
      messageId: sourceMessageId,
      rawTranscript: messageText,
    },
    createdByUserId: senderUserId,
  });

  await notifyProjectIntakeAudience({ persisted, extraction });
  await confirmProjectIntakeOnTelegram({ sourceChatId, persisted, extraction });

  return {
    status: 'ok',
    backlogId: persisted.backlogId,
    projectId: persisted.projectId,
    assigned: persisted.status === 'accepted',
  };
}
