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
};

export const inngest = new Inngest({
  id: 'sn-hr-portal',
  schemas: new EventSchemas().fromRecord<Events>(),
});
