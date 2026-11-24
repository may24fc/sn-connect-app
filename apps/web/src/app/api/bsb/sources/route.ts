import { getAdminClient, getAuthedSupabase, isAiAdmin } from '@/app/api/ai/_lib';
import { hasCurrentDirectAccess, readExactDoc } from '@/lib/bsb/drive';
import { isPublishable, isSameInstant, normalizePrincipal, parseOkfV02 } from '@/lib/bsb/okf';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const reviewSchema = z.object({
  id: z.string().uuid(), action: z.enum(['approve', 'revoke']),
  classification: z.string().trim().min(1).max(100).optional(),
  retentionRule: z.enum(['never', 'until']).optional(),
  retentionUntil: z.string().datetime().optional(),
  processor: z.literal('openai').optional(),
  expiresAt: z.string().datetime().optional(),
  allowedPrincipals: z.array(z.string().email()).min(1).max(30).optional(),
  reason: z.string().trim().min(1).max(500).optional(),
});

async function adminIdentity() {
  const auth = await getAuthedSupabase();
  if (auth.error || !auth.user || !isAiAdmin(auth.role)) return null;
  const { data } = await auth.supabase.from('users').select('status').eq('id', auth.user.id).maybeSingle();
  return data?.status === 'active' ? auth.user : null;
}

export async function GET() {
  const user = await adminIdentity();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await getAdminClient().from('bsb_okf_sources').select('*')
    .order('created_at', { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: 'Unable to load register' }, { status: 500 });
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST() {
  const user = await adminIdentity();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const fileId = process.env.BSB_GOOGLE_DOC_ID?.trim();
  if (!fileId) return NextResponse.json({ error: 'Exact source ID is not configured' }, { status: 503 });
  const admin = getAdminClient();
  const { data: existing } = await admin.from('bsb_okf_sources').select('id,decision').eq('drive_file_id', fileId).maybeSingle();
  if (existing && existing.decision !== 'draft')
    return NextResponse.json({ error: 'Published or revoked source cannot be reimported' }, { status: 409 });
  try {
    const source = await readExactDoc(fileId);
    const okf = parseOkfV02(source.text);
    const payload = {
      drive_file_id: fileId, title: source.title, source_modified_at: source.modifiedAt,
      source_owner_email: source.ownerEmail, okf, imported_by: user.id,
    };
    const mutation = existing
      ? admin.from('bsb_okf_sources').update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id).eq('decision', 'draft')
      : admin.from('bsb_okf_sources').insert(payload);
    const { data, error } = await mutation.select('id,title,decision,created_at').single();
    if (error) return NextResponse.json({ error: 'Unable to save draft' }, { status: 500 });
    return NextResponse.json({ data }, { status: existing ? 200 : 201 });
  } catch {
    return NextResponse.json({ error: 'Configured Google Doc cannot be imported' }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await adminIdentity();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid review' }, { status: 400 });
  const input = parsed.data;
  const admin = getAdminClient();
  const { data: row, error } = await admin.from('bsb_okf_sources').select('*').eq('id', input.id).single();
  if (error || !row || row.drive_file_id !== process.env.BSB_GOOGLE_DOC_ID?.trim())
    return NextResponse.json({ error: 'Source unavailable' }, { status: 404 });

  if (input.action === 'revoke') {
    if (!input.reason) return NextResponse.json({ error: 'Revocation reason required' }, { status: 400 });
    const { error: updateError } = await admin.from('bsb_okf_sources').update({
      decision: 'revoked', revoked_at: new Date().toISOString(), revoked_by: user.id,
      revocation_reason: input.reason,
      allowed_principals: [], updated_at: new Date().toISOString(),
    }).eq('id', input.id).neq('decision', 'revoked');
    return updateError ? NextResponse.json({ error: 'Revocation failed' }, { status: 500 })
      : NextResponse.json({ data: { decision: 'revoked' } });
  }

  if (row.decision !== 'draft')
    return NextResponse.json({ error: 'Only a draft can be approved' }, { status: 409 });
  const principals = [...new Set((input.allowedPrincipals ?? []).map(normalizePrincipal))];
  const candidate: Record<string, unknown> = {
    ...row, classification: input.classification, retention_rule: input.retentionRule,
    retention_until: input.retentionRule === 'never' ? null : input.retentionUntil,
    processor: input.processor,
    expires_at: input.expiresAt, allowed_principals: principals,
    acl_checked_at: new Date().toISOString(),
  };
  if (!isPublishable(candidate)) return NextResponse.json({ error: 'Complete the approval evidence and valid dates' }, { status: 400 });
  try {
    const current = await readExactDoc(row.drive_file_id);
    if (!isSameInstant(current.modifiedAt, row.source_modified_at)) throw new Error('Source changed since import');
    for (const email of principals) {
      if (!(await hasCurrentDirectAccess(row.drive_file_id, email))) throw new Error('Reader ACL unavailable');
    }
  } catch {
    return NextResponse.json({ error: 'Current source or direct reader ACL could not be verified' }, { status: 409 });
  }
  const { error: updateError } = await admin.from('bsb_okf_sources').update({
    ...candidate, reviewer_id: user.id, decision: 'approved', decided_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', input.id).eq('decision', 'draft');
  return updateError ? NextResponse.json({ error: 'Approval failed' }, { status: 500 })
    : NextResponse.json({ data: { decision: 'approved' } });
}
