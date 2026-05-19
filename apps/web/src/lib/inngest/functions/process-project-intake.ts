/**
 * Inngest function: Process a new CEO Telegram message into a project intake.
 *
 * Triggered by `project-intake/received`.
 *
 * Steps:
 *   1. (Optional) Download voice file from Telegram and transcribe via Whisper.
 *   2. Run gpt-4o-mini structured extraction on the resulting text.
 *   3. Persist into `project_backlog` (and auto-create a `projects` row when
 *      the CEO explicitly assigned someone).
 *   4. Notify the right audience and send a Telegram confirmation back to the CEO.
 */

import { extractProjectIntake, transcribeVoice } from '@hr-portal/ai';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { persistProjectIntake } from '@/lib/intake/persist-intake';
import {
  createNotification,
  createNotificationsForUsers,
  getUserIdsByRoles,
} from '@/lib/notifications/create-notification';
import { sendTelegramMessage } from '@/lib/telegram';
import { inngest } from '../client';

async function downloadTelegramFile(fileId: string): Promise<Blob> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

  const meta = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!meta.ok) throw new Error(`Telegram getFile failed: ${meta.status}`);
  const json = (await meta.json()) as { ok: boolean; result?: { file_path?: string } };
  const filePath = json.result?.file_path;
  if (!json.ok || !filePath) throw new Error('Telegram getFile returned no file_path');

  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  if (!fileRes.ok) throw new Error(`Telegram file download failed: ${fileRes.status}`);
  return await fileRes.blob();
}

export const processProjectIntake = inngest.createFunction(
  {
    id: 'project-intake-process',
    retries: 3,
    throttle: { limit: 5, period: '1m' },
  },
  { event: 'project-intake/received' },
  async ({ event, step }) => {
    const { sourceChatId, sourceMessageId, senderUserId, text, voiceFileId } = event.data;

    // 1. Get the text body (transcribe voice if needed).
    const messageText = await step.run('resolve-message-text', async () => {
      if (text && text.length > 0) return text;
      if (!voiceFileId) throw new Error('No text and no voice file provided');

      const blob = await downloadTelegramFile(voiceFileId);
      return await transcribeVoice(blob, `${sourceMessageId}.ogg`, {});
    });

    if (!messageText || messageText.trim().length === 0) {
      return { status: 'ignored', reason: 'empty message' };
    }

    // 2. LLM extraction.
    const extraction = await step.run('extract-structured-payload', async () =>
      extractProjectIntake(messageText)
    );

    // 3. Persist.
    const persisted = await step.run('persist-backlog', async () => {
      const admin = createSupabaseAdminClient();
      return await persistProjectIntake(admin, {
        extraction,
        source: {
          chatId: sourceChatId,
          messageId: sourceMessageId,
          rawTranscript: messageText,
        },
        createdByUserId: senderUserId,
      });
    });

    // 4. Notifications + Telegram reply (fire-and-forget patterns).
    await step.run('notify', async () => {
      if (persisted.status === 'accepted' && persisted.assignedUserId) {
        await createNotification({
          userId: persisted.assignedUserId,
          type: 'project_assigned',
          title: `New project assigned: ${extraction.title}`,
          message: extraction.objective,
          link: persisted.projectId ? `/projects/${persisted.projectId}` : `/projects/pool`,
          metadata: { backlogId: persisted.backlogId, source: 'telegram-intake' },
          sendEmail: true,
          sendTelegram: true,
        });
      } else {
        const internIds = await getUserIdsByRoles(['intern', 'employee']);
        if (internIds.length > 0) {
          await createNotificationsForUsers(internIds, {
            type: 'project_claimable',
            title: `New project in the pool: ${extraction.title}`,
            message: extraction.problem_statement,
            link: '/projects/pool',
            metadata: { backlogId: persisted.backlogId, source: 'telegram-intake' },
            sendEmail: false,
            sendTelegram: false,
          });
        }
      }
    });

    await step.run('telegram-confirm', async () => {
      const summary = persisted.status === 'accepted'
        ? `Project "${extraction.title}" was assigned${extraction.assigned_name_hint ? ` to ${extraction.assigned_name_hint}` : ''}.`
        : `Project "${extraction.title}" added to the Project Pool — interns will be notified.`;

      await sendTelegramMessage({ chatId: sourceChatId, text: summary });
    });

    return {
      status: 'ok',
      backlogId: persisted.backlogId,
      projectId: persisted.projectId,
      assigned: persisted.status === 'accepted',
    };
  }
);
