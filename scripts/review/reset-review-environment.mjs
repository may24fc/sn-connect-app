import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing environment file: ${file}`);
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const envArgIndex = process.argv.indexOf('--env-file');
const envFile = path.resolve(
  envArgIndex >= 0 ? process.argv[envArgIndex + 1] : 'apps/web/.env.review'
);
loadEnv(envFile);

const apply = process.argv.includes('--apply');
const environment = process.env.CONTROL_HUB_ENV?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (environment !== 'review') throw new Error('Refusing reset: CONTROL_HUB_ENV must equal review.');
if (!url || !serviceKey) throw new Error('Missing review Supabase URL or service-role key.');
const isHostedProject = /supabase\.co/i.test(url);
const reviewProjectRef = process.env.REVIEW_PROJECT_REF?.trim();
if (isHostedProject && (!reviewProjectRef || !url.includes(reviewProjectRef))) {
  throw new Error(
    'Refusing hosted reset: REVIEW_PROJECT_REF is required and must match the Supabase URL.'
  );
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: active, error: activeError } = await admin
  .from('review_engagements')
  .select('id, reviewer_user_id, expires_at')
  .eq('status', 'active');
if (activeError) throw activeError;

console.info(`[review-reset] ${apply ? 'APPLY' : 'DRY RUN'} ${url}`);
console.info(`[review-reset] active engagements: ${active?.length ?? 0}`);
if (!apply) {
  console.info('[review-reset] No changes made. Re-run with --apply after confirming the target.');
  process.exit(0);
}

const now = new Date().toISOString();
for (const engagement of active ?? []) {
  const { error: banError } = await admin.auth.admin.updateUserById(engagement.reviewer_user_id, {
    ban_duration: '876000h',
  });
  if (banError) throw banError;
  const { error: revokeError } = await admin
    .from('review_engagements')
    .update({ status: 'revoked', ended_at: now })
    .eq('id', engagement.id);
  if (revokeError) throw revokeError;
}

const { error: deleteError } = await admin.from('review_demo_items').delete().not('id', 'is', null);
if (deleteError) throw deleteError;
const { error: seedError } = await admin.from('review_demo_items').insert([
  {
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'objective',
    title: 'Improve the customer onboarding experience',
    description: 'A fictional objective for product exploration.',
    status: 'in_progress',
    progress: 45,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    kind: 'objective',
    title: 'Make weekly reporting easier to understand',
    description: 'A fictional objective containing no company information.',
    status: 'not_started',
    progress: 0,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    kind: 'task',
    title: 'Review the welcome checklist',
    description: 'Try updating this safe demonstration task.',
    status: 'in_progress',
    progress: 50,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    kind: 'task',
    title: 'Suggest one navigation improvement',
    description: 'Submit the suggestion through the feedback form.',
    status: 'not_started',
    progress: 0,
  },
]);
if (seedError) throw seedError;
console.info(
  '[review-reset] Reviewers revoked and synthetic workspace reset. Feedback was preserved.'
);
