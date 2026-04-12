import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { processDriveDoc } from '@/lib/inngest/functions/process-drive-doc';
import { parseResume } from '@/lib/inngest/functions/parse-resume';
import { evaluateResume } from '@/lib/inngest/functions/evaluate-resume';

export const runtime = 'nodejs';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processDriveDoc, parseResume, evaluateResume],
});
