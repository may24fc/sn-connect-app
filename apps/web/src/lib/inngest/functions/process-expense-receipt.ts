import { extractReceiptFromImage, extractReceiptFromText } from '@hr-portal/ai';
import { extractText, getDocumentProxy } from 'unpdf';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { inngest } from '../client';

const EXPENSE_RECEIPTS_BUCKET = 'expense-receipts';

function inferExpenseType(vendorName: string):
  | 'office_supplies'
  | 'travel'
  | 'meals'
  | 'software'
  | 'equipment'
  | 'utilities'
  | 'maintenance'
  | 'other' {
  const normalized = vendorName.trim().toLowerCase();

  if (/microsoft|google|aws|openai|anthropic|figma|notion|slack|github/.test(normalized)) {
    return 'software';
  }

  if (/uber|grab|lyft|airlines|hotel|booking|expedia|transport/.test(normalized)) {
    return 'travel';
  }

  if (/starbucks|restaurant|cafe|coffee|food|meal/.test(normalized)) {
    return 'meals';
  }

  if (/office|depot|staples|paper|stationery/.test(normalized)) {
    return 'office_supplies';
  }

  if (/electric|water|internet|telecom|utility/.test(normalized)) {
    return 'utilities';
  }

  if (/repair|maintenance|service center|mechanic/.test(normalized)) {
    return 'maintenance';
  }

  if (/laptop|monitor|printer|hardware|device|equipment/.test(normalized)) {
    return 'equipment';
  }

  return 'other';
}

async function suggestDraftAccounts(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  vendorName: string
): Promise<{
  debitAccount: string;
  creditAccount: string;
  confidence: number;
}> {
  const vendorPrefix = `${vendorName.trim()}%`;

  const { data, error } = await adminClient
    .from('expense_entries')
    .select('verified_debit_account, verified_credit_account')
    .ilike('vendor_name', vendorPrefix)
    .not('verified_debit_account', 'is', null)
    .not('verified_credit_account', 'is', null)
    .is('deleted_at', null)
    .order('reviewed_at', { ascending: false })
    .limit(20);

  if (error || !data || data.length === 0) {
    return {
      debitAccount: 'Operating Expenses',
      creditAccount: 'Company Credit Card',
      confidence: 0.35,
    };
  }

  const frequencyMap = new Map<string, number>();
  for (const row of data) {
    const key = `${row.verified_debit_account}|${row.verified_credit_account}`;
    frequencyMap.set(key, (frequencyMap.get(key) ?? 0) + 1);
  }

  let topKey = '';
  let topCount = 0;
  for (const [key, count] of frequencyMap.entries()) {
    if (count > topCount) {
      topKey = key;
      topCount = count;
    }
  }

  const [debitAccount, creditAccount] = topKey.split('|');
  const confidence = Math.min(0.95, 0.5 + topCount / (data.length * 2));

  return {
    debitAccount: debitAccount ?? 'Operating Expenses',
    creditAccount: creditAccount ?? 'Company Credit Card',
    confidence,
  };
}

async function extractFromPdf(fileBuffer: ArrayBuffer): Promise<{
  vendorName: string;
  transactionDate: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  fieldConfidence: {
    vendorName: number;
    transactionDate: number;
    totalAmount: number;
    taxAmount: number;
    currency: number;
  };
}> {
  const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
  const { text } = await extractText(pdf, { mergePages: true });
  await pdf.destroy();

  if (text && text.trim().length >= 20) {
    return extractReceiptFromText(text);
  }

  // Fallback for scanned/image-based PDFs that do not expose selectable text.
  try {
    return await extractReceiptFromImage(Buffer.from(fileBuffer).toString('base64'), 'application/pdf');
  } catch (imageFallbackError) {
    const message =
      imageFallbackError instanceof Error ? imageFallbackError.message : 'Unknown PDF image extraction error';
    throw new Error(`PDF has no extractable text and image fallback failed: ${message}`);
  }
}

export const processExpenseReceipt = inngest.createFunction(
  {
    id: 'expenses-process-receipt',
    retries: 3,
    concurrency: { limit: 8 },
  },
  { event: 'expenses/receipt.uploaded' },
  async ({ event, step }) => {
    const { expenseEntryId, filePath, mimeType } = event.data;

    const adminClient = createSupabaseAdminClient();

    try {
      const fileBuffer = await step.run('download-receipt', async () => {
        const { data, error } = await adminClient.storage
          .from(EXPENSE_RECEIPTS_BUCKET)
          .download(filePath);

        if (error || !data) {
          throw new Error(`Failed to download receipt: ${error?.message ?? 'No data'}`);
        }

        return await data.arrayBuffer();
      });

      const extraction = await step.run('extract-receipt', async () => {
        const receiptBuffer = fileBuffer as ArrayBuffer;

        if (mimeType === 'application/pdf') {
          return extractFromPdf(receiptBuffer);
        }

        return extractReceiptFromImage(Buffer.from(receiptBuffer).toString('base64'), mimeType);
      });

      const suggestion = await step.run('suggest-ledger-accounts', async () => {
        return suggestDraftAccounts(adminClient, extraction.vendorName);
      });

      const extractionConfidenceAverage =
        (extraction.fieldConfidence.vendorName +
          extraction.fieldConfidence.transactionDate +
          extraction.fieldConfidence.totalAmount +
          extraction.fieldConfidence.taxAmount +
          extraction.fieldConfidence.currency) /
        5;

      const combinedAiConfidence = Math.min(
        0.99,
        (extractionConfidenceAverage + suggestion.confidence) / 2
      );

      const inferredExpenseType = inferExpenseType(extraction.vendorName);

      await step.run('update-expense-entry', async () => {
        const { error } = await adminClient
          .from('expense_entries')
          .update({
            vendor_name: extraction.vendorName,
            transaction_date: extraction.transactionDate,
            total_amount: extraction.totalAmount,
            tax_amount: extraction.taxAmount,
            currency: extraction.currency,
            draft_debit_account: suggestion.debitAccount,
            draft_credit_account: suggestion.creditAccount,
            ai_debit_account: suggestion.debitAccount,
            ai_credit_account: suggestion.creditAccount,
            ai_confidence: combinedAiConfidence,
            expense_type: inferredExpenseType,
            processing_status: 'awaiting_intern_review',
          })
          .eq('id', expenseEntryId)
          .is('deleted_at', null);

        if (error) {
          throw new Error(`Failed to update queued expense entry: ${error.message}`);
        }
      });

      return { status: 'processed', expenseEntryId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown extraction error';

      await step.run('mark-extraction-error', async () => {
        await adminClient
          .from('expense_entries')
          .update({
            processing_status: 'awaiting_intern_review',
            reviewer_notes: `Receipt extraction failed: ${message}`,
          })
          .eq('id', expenseEntryId)
          .is('deleted_at', null);
      });

      throw error;
    }
  }
);
