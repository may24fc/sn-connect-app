import { getAdminClient, getAuthedSupabase, isAiAdmin } from '@/app/api/ai/_lib';
import { hasCurrentDirectAccess, listDirectUserEmails, readDocVersion, readExactDoc } from '@/lib/bsb/drive';
import { isOkfV02, isPublishable, isSameInstant, normalizePrincipal, parseGoogleDocId, parseOkfV02 } from '@/lib/bsb/okf';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const importSchema = z.object({ source: z.string().trim().min(1).max(500) });
const DRAFT_RESET = {
  decision: 'draft', classification: null, retention_rule: 'pending', retention_until: null, processor: null,
  expires_at: null, allowed_principals: [], acl_checked_at: null, reviewer_id: null, decided_at: null,
  revoked_at: null, revoked_by: null, revocation_reason: null,
};

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
  if (auth.error || !auth.user?.email || !auth.user.email_confirmed_at || !isAiAdmin(auth.role)) return null;
  const { data } = await auth.supabase.from('users').select('status').eq('id', auth.user.id).maybeSingle();
  return data?.status === 'active' ? auth.user : null;
}

export async function GET(request: NextRequest) {
  const user = await adminIdentity();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  if (id !== null) {
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    const { data: row, error } = await getAdminClient().from('bsb_okf_sources')
      .select('id,drive_file_id,source_modified_at,decision,okf').eq('id', id).maybeSingle();
    if (error || !row || row.decision !== 'draft' || !isOkfV02(row.okf))
      return NextResponse.json({ error: 'Source unavailable' }, { status: 404 });
    try {
      if (!(await hasCurrentDirectAccess(row.drive_file_id, user.email!)))
        return NextResponse.json({ error: 'Source unavailable' }, { status: 404 });
      if (!isSameInstant(await readDocVersion(row.drive_file_id), row.source_modified_at))
        return NextResponse.json({ error: 'The Google Doc changed. Re-import it before review.' }, { status: 409 });
    } catch {
      return NextResponse.json({ error: 'Source unavailable' }, { status: 404 });
    }
    return NextResponse.json({ data: { id: row.id, facts: row.okf.facts } },
      { headers: { 'Cache-Control': 'no-store' } });
  }
  // The register can show metadata to admins; raw note text is fetched only after a live ACL check.
  const { data, error } = await getAdminClient().from('bsb_okf_sources')
    .select('id,title,drive_file_id,decision,classification,source_owner_email,retention_rule,retention_until,acl_checked_at,reviewer_id,expires_at,revoked_at')
    .order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'Unable to load register' }, { status: 500 });
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const user = await adminIdentity();
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  const fileId = parsed.success ? parseGoogleDocId(parsed.data.source) : null;
  if (!fileId) return NextResponse.json({ error: 'Enter a Google Doc link or file ID' }, { status: 400 });
  try {
    if (!(await hasCurrentDirectAccess(fileId, user.email!)))
      return NextResponse.json({ error: 'Your admin email needs direct access to this Google Doc before import.' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Unable to verify this Doc\'s sharing list. Share it with the BSB service account as Editor.' }, { status: 502 });
  }
  const admin = getAdminClient();
  const { data: existing } = await admin.from('bsb_okf_sources').select('id,decision').eq('drive_file_id', fileId).maybeSingle();
  try {
    const source = await readExactDoc(fileId);
    const okf = parseOkfV02(source.text);
    const payload = {
      drive_file_id: fileId, title: source.title, source_modified_at: source.modifiedAt,
      source_owner_email: source.ownerEmail, okf, imported_by: user.id,
    };
    // Re-importing an approved or revoked Doc (e.g. after it was edited) takes a fresh snapshot and
    // returns it to an unpublished draft. It stops answering until an admin approves it again.
    const mutation = existing
      ? admin.from('bsb_okf_sources').update({ ...payload, ...(existing.decision === 'draft' ? {} : DRAFT_RESET),
        updated_at: new Date().toISOString() }).eq('id', existing.id).eq('decision', existing.decision)
      : admin.from('bsb_okf_sources').insert(payload);
    const { data, error } = await mutation.select('id,title,decision,created_at').single();
    if (error) return NextResponse.json({ error: 'Unable to save draft' }, { status: 500 });
    if (existing && existing.decision !== 'draft') {
      const { error: auditError } = await admin.from('audit_logs').insert({
        performed_by: user.id, action: 'bsb_source_reimported_to_draft', table_name: 'bsb_okf_sources',
        record_id: existing.id, operation: 'UPDATE', metadata: { previous_decision: existing.decision },
      });
      if (auditError) console.error('Failed to audit BSB source re-import');
    }
    return NextResponse.json({ data }, { status: existing ? 200 : 201 });
  } catch {
    // The service account can only read Docs explicitly shared with it; sharing is the import opt-in.
    return NextResponse.json({ error: 'Google Doc cannot be imported. Share it with the BSB service account as Editor and try again.' }, { status: 502 });
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
  if (error || !row) return NextResponse.json({ error: 'Source unavailable' }, { status: 404 });

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
  // Admin-only route: say which live check failed so the admin can fix it. Every failure still blocks approval.
  const conflict = (message: string) => NextResponse.json({ error: message }, { status: 409 });
  let version: string;
  try { version = await readDocVersion(row.drive_file_id); }
  catch { return conflict('The BSB service account can no longer open this Google Doc. Check it is not deleted and is still shared with the service account.'); }
  if (!isSameInstant(version, row.source_modified_at))
    return conflict('The Google Doc changed after it was imported. Import the same link again to refresh the draft, then approve.');
  let readers: Set<string>;
  try { readers = await listDirectUserEmails(row.drive_file_id); }
  catch { return conflict('The BSB service account cannot read this Doc\'s sharing list. Share the Doc with the service account as Editor, then approve again.'); }
  if (!readers.has(normalizePrincipal(user.email!)))
    return conflict('Your admin email needs direct access to this Google Doc before approval.');
  const missing = principals.filter((email) => !readers.has(email));
  if (missing.length > 0)
    return conflict(`These readers need their own direct access to the Google Doc (link, domain or group sharing does not count): ${missing.join(', ')}`);
  const { error: updateError } = await admin.from('bsb_okf_sources').update({
    ...candidate, reviewer_id: user.id, decision: 'approved', decided_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', input.id).eq('decision', 'draft');
  return updateError ? NextResponse.json({ error: 'Approval failed' }, { status: 500 })
    : NextResponse.json({ data: { decision: 'approved' } });
}
