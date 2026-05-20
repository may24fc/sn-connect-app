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

import { extractProjectIntake } from '@hr-portal/ai';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { persistProjectIntake } from '@/lib/intake/persist-intake';
import {
  confirmProjectIntakeOnTelegram,
  notifyProjectIntakeAudience,
  resolveProjectIntakeMessageText,
} from '@/lib/intake/process-project-intake-message';
import { inngest } from '../client';

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
      return await resolveProjectIntakeMessageText({
        text,
        voiceFileId,
        sourceMessageId,
      });
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
      await notifyProjectIntakeAudience({ persisted, extraction });
    });

    await step.run('telegram-confirm', async () => {
      await confirmProjectIntakeOnTelegram({
        sourceChatId,
        persisted,
        extraction,
      });
    });

    return {
      status: 'ok',
      backlogId: persisted.backlogId,
      projectId: persisted.projectId,
      assigned: persisted.status === 'accepted',
    };
  }
);
