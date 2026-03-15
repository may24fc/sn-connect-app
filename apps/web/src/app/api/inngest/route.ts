import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { processDriveDoc } from '@/lib/inngest/functions/process-drive-doc';

export const runtime = 'nodejs';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processDriveDoc],
});
