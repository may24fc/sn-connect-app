import { logActivity } from '@/lib/audit';
import { canReviewFinance, getFinanceContext } from '@/lib/finance/auth';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const correctionSchema = z.object({
  paymentSource: z.enum(['unknown', 'personal_card', 'company_card', 'bank_transfer']),
  paymentStatus: z.enum(['unknown', 'unpaid', 'confirmed']),
});
const RECEIPT_BUCKET = 'expense-receipts';
const ALLOWED_RECEIPTS = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
  const parsed = correctionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid expense correction' }, { status: 400 });
  const db = context.admin as any;
  const current = await db
    .from('expense_entries')
    .select('id,payment_source,payment_status')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (current.error || !current.data)
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  const updated = await db
    .from('expense_entries')
    .update({
      payment_source: parsed.data.paymentSource,
      payment_status: parsed.data.paymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id,payment_source,payment_status')
    .single();
  if (updated.error)
    return NextResponse.json({ error: 'Could not update expense details' }, { status: 500 });
  logActivity(context.admin, {
    userId: context.user.id,
    action: 'finance_expense_metadata_update',
    tableName: 'expense_entries',
    recordId: id,
    metadata: { before: current.data, after: updated.data },
  });
  return NextResponse.json({ data: updated.data });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getFinanceContext();
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!canReviewFinance(context.capabilities))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: 'Invalid expense ID' }, { status: 400 });
  const file = (await request.formData()).get('file');
  if (!(file instanceof File) || file.size === 0 || file.size > 10 * 1024 * 1024 || !ALLOWED_RECEIPTS.has(file.type))
    return NextResponse.json({ error: 'Choose a PDF, JPG, PNG, or WEBP receipt up to 10MB' }, { status: 400 });
  const db = context.admin as any;
  const current = await db.from('expense_entries').select('id,employee_id,receipt_document_id').eq('id', id).is('deleted_at', null).maybeSingle();
  if (current.error || !current.data)
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  if (!current.data.employee_id)
    return NextResponse.json({ error: 'Assign this legacy expense to an employee before attaching a receipt' }, { status: 409 });
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${current.data.employee_id}/other/${Date.now()}_${safeName}`;
  const upload = await db.storage.from(RECEIPT_BUCKET).upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (upload.error) return NextResponse.json({ error: 'Could not upload receipt' }, { status: 500 });
  const document = await db.from('documents').insert({
    employee_id: current.data.employee_id,
    document_type: 'other', file_path: upload.data.path, file_name: file.name,
    file_size: file.size, mime_type: file.type, is_confidential: false,
    notes: 'expense_receipt', uploaded_by: context.user.id, created_by: context.user.id,
  }).select('id').single();
  if (document.error || !document.data?.id) {
    await db.storage.from(RECEIPT_BUCKET).remove([filePath]);
    return NextResponse.json({ error: 'Could not save receipt record' }, { status: 500 });
  }
  const updated = await db.from('expense_entries').update({ receipt_document_id: document.data.id, updated_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null).select('id,receipt_document_id').single();
  if (updated.error) {
    await db.from('documents').delete().eq('id', document.data.id);
    await db.storage.from(RECEIPT_BUCKET).remove([filePath]);
    return NextResponse.json({ error: 'Could not attach receipt' }, { status: 500 });
  }
  logActivity(context.admin, { userId: context.user.id, action: 'finance_expense_receipt_attach', tableName: 'expense_entries', recordId: id, metadata: { previousDocumentId: current.data.receipt_document_id, documentId: document.data.id } });
  return NextResponse.json({ data: updated.data });
}
