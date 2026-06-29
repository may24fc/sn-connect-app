import { EventSchemas, Inngest } from 'inngest';

type Events = {
  'drive/document.updated': {
    data: {
      /** Google Drive file ID extracted from the resource URI. */
      fileId: string;
      /** Google opaque resource identifier (x-goog-resource-id). */
      resourceId: string;
      /** Notification state: "update", "change", etc. */
      resourceState: string;
      /** Channel ID set when the watch was created. */
      channelId: string;
      /** ISO-8601 timestamp of when the webhook was received. */
      timestamp: string;
    };
  };
  'ats/resume.upload': {
    data: {
      /** UUID of the job_applications row. */
      applicationId: string;
      /** Supabase Storage path to the uploaded CV file. */
      filePath: string;
    };
  };
  'ats/resume.parsed': {
    data: {
      /** UUID of the job_applications row whose resume was parsed. */
      applicationId: string;
    };
  };
  'project-intake/received': {
    data: {
      /** Telegram chat ID the message originated from (string-encoded). */
      sourceChatId: string;
      /** Telegram message ID (string-encoded). */
      sourceMessageId: string;
      /** Auth user ID of the CEO whose Telegram chat the message came from. */
      senderUserId: string;
      /** Raw text body (already trimmed). Empty string when only voice. */
      text: string;
      /** Telegram file_id for the voice note, if any. */
      voiceFileId?: string;
      /** Mime type for the voice file, if any. */
      voiceMimeType?: string;
    };
  };
  'expenses/receipt.uploaded': {
    data: {
      expenseEntryId: string;
      receiptDocumentId: string;
      filePath: string;
      mimeType: string;
      submittedBy: string;
    };
  };
};

export const inngest = new Inngest({
  id: 'sn-hr-portal',
  schemas: new EventSchemas().fromRecord<Events>(),
});
