import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { extractReceiptFromImage, extractReceiptFromText } from '@hr-portal/ai';
import { extractText, getDocumentProxy } from 'unpdf';

const EMPLOYEE_DOCUMENTS_BUCKET = 'employee-documents';
const OCR_SUPPORTED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

type InvoiceDocumentExtractionRaw = {
  invoiceNumber: string | null;
  totalAmount: number;
  currency: string;
  phpAmount: number | null;
  audAmount: number | null;
};

export type InvoiceDocumentAmounts = {
  invoiceNumber: string | null;
  amount: number | null;
  currency: string | null;
  phpAmount: number | null;
  audAmount: number | null;
  reason?: string;
};

function normalizeInvoiceNumber(raw: string | null | undefined): string | null {
  if (!(typeof raw === 'string' && raw.trim().length > 0)) {
    return null;
  }

  return raw.trim().replace(/^invoice\s*(number|#|no\.?|num(?:ber)?)\s*[:#-]*\s*/i, '') || null;
}

async function extractFromPdf(fileBuffer: ArrayBuffer): Promise<InvoiceDocumentExtractionRaw> {
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  const { text } = await extractText(pdf, { mergePages: true });
  await pdf.destroy();

  if (text && text.trim().length >= 20) {
    const extracted = await extractReceiptFromText(text);

    return {
      invoiceNumber: extracted.invoiceNumber,
      totalAmount: extracted.totalAmount,
      currency: extracted.currency,
      phpAmount: extracted.phpAmount,
      audAmount: extracted.audAmount,
    };
  }

  const extracted = await extractReceiptFromImage(
    Buffer.from(fileBuffer).toString('base64'),
    'application/pdf'
  );

  return {
    invoiceNumber: extracted.invoiceNumber,
    totalAmount: extracted.totalAmount,
    currency: extracted.currency,
    phpAmount: extracted.phpAmount,
    audAmount: extracted.audAmount,
  };
}

export async function extractAmountFromInvoiceDocument(params: {
  adminClient: ReturnType<typeof createSupabaseAdminClient>;
  documentId: string;
  employeeId: string;
}): Promise<InvoiceDocumentAmounts> {
  const { adminClient, documentId, employeeId } = params;

  const { data: document, error: documentError } = await adminClient
    .from('documents')
    .select('id, employee_id, file_path, mime_type')
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle();

  if (documentError || !document) {
    return {
      invoiceNumber: null,
      amount: null,
      currency: null,
      phpAmount: null,
      audAmount: null,
      reason: 'Document not found for OCR extraction',
    };
  }

  if (document.employee_id !== employeeId) {
    return {
      invoiceNumber: null,
      amount: null,
      currency: null,
      phpAmount: null,
      audAmount: null,
      reason: 'Document does not belong to invoice employee',
    };
  }

  if (!document.mime_type || !OCR_SUPPORTED_MIME_TYPES.has(document.mime_type)) {
    return {
      invoiceNumber: null,
      amount: null,
      currency: null,
      phpAmount: null,
      audAmount: null,
      reason: 'Unsupported file type for OCR extraction',
    };
  }

  const { data: fileBlob, error: downloadError } = await adminClient.storage
    .from(EMPLOYEE_DOCUMENTS_BUCKET)
    .download(document.file_path);

  if (downloadError || !fileBlob) {
    return {
      invoiceNumber: null,
      amount: null,
      currency: null,
      phpAmount: null,
      audAmount: null,
      reason: 'Failed to download invoice document for OCR',
    };
  }

  const fileBuffer = await fileBlob.arrayBuffer();
  if (fileBuffer.byteLength === 0) {
    return {
      invoiceNumber: null,
      amount: null,
      currency: null,
      phpAmount: null,
      audAmount: null,
      reason: 'Invoice document is empty',
    };
  }

  try {
    const extracted =
      document.mime_type === 'application/pdf'
        ? await extractFromPdf(fileBuffer)
        : await extractReceiptFromImage(
            Buffer.from(fileBuffer).toString('base64'),
            document.mime_type
          );

    const parsedAmount = Number(extracted.totalAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return {
        invoiceNumber: null,
        amount: null,
        currency: null,
        phpAmount: null,
        audAmount: null,
        reason: 'OCR amount could not be determined',
      };
    }

    const normalizedCurrency =
      typeof extracted.currency === 'string' && extracted.currency.trim().length === 3
        ? extracted.currency.trim().toUpperCase()
        : null;

    const phpAmount =
      typeof extracted.phpAmount === 'number' && extracted.phpAmount > 0
        ? Math.round(extracted.phpAmount * 100) / 100
        : null;

    const audAmount =
      typeof extracted.audAmount === 'number' && extracted.audAmount > 0
        ? Math.round(extracted.audAmount * 100) / 100
        : null;

    return {
      invoiceNumber: normalizeInvoiceNumber(extracted.invoiceNumber),
      amount: Math.round(parsedAmount * 100) / 100,
      currency: normalizedCurrency,
      phpAmount,
      audAmount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown OCR extraction error';

    return {
      invoiceNumber: null,
      amount: null,
      currency: null,
      phpAmount: null,
      audAmount: null,
      reason: `OCR extraction failed: ${message}`,
    };
  }
}