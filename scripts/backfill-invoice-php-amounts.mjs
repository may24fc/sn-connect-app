import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { extractText, getDocumentProxy } from 'unpdf';

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const APPLY = process.argv.includes('--apply');
const CONFIRM_PROD = process.argv.includes('--confirm-prod');
const INCLUDE_DRAFTS = process.argv.includes('--include-drafts');

const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const invoiceIdArg = process.argv.find((arg) => arg.startsWith('--invoice-id='));
const LIMIT = limitArg ? Number.parseInt(limitArg.split('=')[1] || '', 10) : null;
const INVOICE_ID = invoiceIdArg ? invoiceIdArg.split('=')[1] || null : null;

const OCR_SUPPORTED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const separatorIndex = trimmed.indexOf('=');
  if (separatorIndex === -1) return null;

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed) {
      env[parsed.key] = parsed.value;
    }
  }

  return env;
}

function loadEnv() {
  const cwd = process.cwd();
  const envBase = loadEnvFile(path.join(cwd, '.env'));
  const envLocal = loadEnvFile(path.join(cwd, '.env.local'));
  return { ...process.env, ...envBase, ...envLocal };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function roundRate(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizeInvoiceNumber(raw) {
  if (!(typeof raw === 'string' && raw.trim().length > 0)) {
    return null;
  }

  return raw.trim().replace(/^invoice\s*(number|#|no\.?|num(?:ber)?)\s*[:#-]*\s*/i, '') || null;
}

function isLikelyProdUrl(baseUrl) {
  return !/localhost|127\.0\.0\.1/i.test(baseUrl);
}

function getOpenAiClient(env) {
  const apiKey = env.OPENAI_API_KEY || '';
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  return new OpenAI({ apiKey });
}

async function extractFromText(client, text, model) {
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You extract invoice metadata for accounting backfills.
Return only the required JSON schema output.

Extraction rules:
- invoiceNumber: the invoice number exactly as shown on the document, without inventing or reformatting it. If no invoice number is visible, return null.
- totalAmount: the primary final total paid, numeric only.
- currency: one of PHP, USD, EUR, AUD, GBP, SGD, JPY.
- phpAmount: if a Philippine Peso (₱ or PHP) total amount is explicitly shown anywhere on the document, return it as a positive number. Otherwise return null.
- audAmount: if an Australian Dollar (A$ or AUD) total amount is explicitly shown anywhere on the document, return it as a positive number. Otherwise return null.
- If both PHP and AUD totals are shown, extract both.
- Do not add extra fields.`,
      },
      {
        role: 'user',
        content: `Extract invoice metadata from this OCR text:\n\n${text}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'invoice_backfill_extraction',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            invoiceNumber: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            totalAmount: { type: 'number' },
            currency: {
              type: 'string',
              enum: ['PHP', 'USD', 'EUR', 'AUD', 'GBP', 'SGD', 'JPY'],
            },
            phpAmount: { anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }] },
            audAmount: { anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }] },
          },
          required: ['invoiceNumber', 'totalAmount', 'currency', 'phpAmount', 'audAmount'],
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned empty OCR extraction response');
  }

  return JSON.parse(content);
}

async function extractFromImage(client, imageBase64, mimeType, model) {
  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You extract invoice metadata for accounting backfills.
Return only the required JSON schema output.

Extraction rules:
- invoiceNumber: the invoice number exactly as shown on the document, without inventing or reformatting it. If no invoice number is visible, return null.
- totalAmount: the primary final total paid, numeric only.
- currency: one of PHP, USD, EUR, AUD, GBP, SGD, JPY.
- phpAmount: if a Philippine Peso (₱ or PHP) total amount is explicitly shown anywhere on the document, return it as a positive number. Otherwise return null.
- audAmount: if an Australian Dollar (A$ or AUD) total amount is explicitly shown anywhere on the document, return it as a positive number. Otherwise return null.
- If both PHP and AUD totals are shown, extract both.
- Do not add extra fields.`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract invoice metadata from this invoice image.' },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'invoice_backfill_extraction',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            invoiceNumber: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            totalAmount: { type: 'number' },
            currency: {
              type: 'string',
              enum: ['PHP', 'USD', 'EUR', 'AUD', 'GBP', 'SGD', 'JPY'],
            },
            phpAmount: { anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }] },
            audAmount: { anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }] },
          },
          required: ['invoiceNumber', 'totalAmount', 'currency', 'phpAmount', 'audAmount'],
        },
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned empty OCR extraction response');
  }

  return JSON.parse(content);
}

async function extractInvoiceMetadata(client, fileBuffer, mimeType, model) {
  let extracted;

  if (mimeType === 'application/pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
    const { text } = await extractText(pdf, { mergePages: true });
    await pdf.destroy();

    if (text && text.trim().length >= 20) {
      extracted = await extractFromText(client, text, model);
    } else {
      extracted = await extractFromImage(client, Buffer.from(fileBuffer).toString('base64'), mimeType, model);
    }
  } else {
    extracted = await extractFromImage(client, Buffer.from(fileBuffer).toString('base64'), mimeType, model);
  }

  return {
    invoiceNumber: normalizeInvoiceNumber(extracted.invoiceNumber),
    phpAmount:
      typeof extracted.phpAmount === 'number' && extracted.phpAmount > 0
        ? roundMoney(extracted.phpAmount)
        : null,
    audAmount:
      typeof extracted.audAmount === 'number' && extracted.audAmount > 0
        ? roundMoney(extracted.audAmount)
        : null,
  };
}

async function fetchInvoices(supabase) {
  const statuses = INCLUDE_DRAFTS ? ['draft', 'submitted', 'approved', 'paid'] : ['submitted', 'approved', 'paid'];
  const pageSize = 200;
  let from = 0;
  const results = [];

  while (true) {
    let query = supabase
      .from('invoices')
      .select('id, employee_id, invoice_number, gross_amount, deductions, net_amount, source_currency, target_currency, exchange_rate, converted_amount, status, document_id, created_at')
      .in('status', statuses)
      .not('document_id', 'is', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (INVOICE_ID) {
      query = query.eq('id', INVOICE_ID);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load invoices: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    results.push(...data);

    if (INVOICE_ID || data.length < pageSize || (LIMIT !== null && results.length >= LIMIT)) {
      break;
    }

    from += pageSize;
  }

  return LIMIT !== null ? results.slice(0, LIMIT) : results;
}

async function fetchDocumentAndExtract(supabase, openaiClient, invoice, model) {
  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id, employee_id, file_path, mime_type')
    .eq('id', invoice.document_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (documentError || !document) {
    return { ok: false, reason: 'Document not found' };
  }

  if (document.employee_id !== invoice.employee_id) {
    return { ok: false, reason: 'Document employee mismatch' };
  }

  if (!document.mime_type || !OCR_SUPPORTED_MIME_TYPES.has(document.mime_type)) {
    return { ok: false, reason: `Unsupported document mime type: ${document.mime_type || 'unknown'}` };
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('employee-documents')
    .download(document.file_path);

  if (downloadError || !fileBlob) {
    return { ok: false, reason: 'Failed to download document' };
  }

  const fileBuffer = await fileBlob.arrayBuffer();
  if (fileBuffer.byteLength === 0) {
    return { ok: false, reason: 'Empty document file' };
  }

  try {
    const extracted = await extractInvoiceMetadata(openaiClient, fileBuffer, document.mime_type, model);
    return { ok: true, extracted };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Unknown OCR extraction error',
    };
  }
}

function buildInvoiceUpdates(invoice, extracted) {
  if (typeof extracted.phpAmount !== 'number' || extracted.phpAmount <= 0) {
    return null;
  }

  const deductions = Number(invoice.deductions || 0);
  const resolvedNetAmount = Math.max(0, roundMoney(extracted.phpAmount - deductions));
  const currentGross = Number(invoice.gross_amount || 0);
  const currentNet = Number(invoice.net_amount || 0);
  const currentConverted =
    invoice.converted_amount === null || invoice.converted_amount === undefined
      ? null
      : Number(invoice.converted_amount);

  const updates = {
    gross_amount: extracted.phpAmount,
    net_amount: resolvedNetAmount,
    source_currency: 'PHP',
  };

  if (typeof extracted.audAmount === 'number' && extracted.audAmount > 0) {
    updates.target_currency = 'AUD';
    updates.converted_amount = extracted.audAmount;
    updates.exchange_rate = resolvedNetAmount > 0 ? roundRate(extracted.audAmount / resolvedNetAmount) : null;
  } else if (invoice.target_currency === 'AUD' && currentConverted !== null && currentConverted > 0) {
    updates.target_currency = 'AUD';
    updates.converted_amount = currentConverted;
    updates.exchange_rate = resolvedNetAmount > 0 ? roundRate(currentConverted / resolvedNetAmount) : null;
  } else {
    updates.target_currency = 'PHP';
    updates.converted_amount = resolvedNetAmount;
    updates.exchange_rate = 1;
  }

  const changed =
    currentGross !== updates.gross_amount ||
    currentNet !== updates.net_amount ||
    invoice.source_currency !== updates.source_currency ||
    invoice.target_currency !== updates.target_currency ||
    Number(invoice.exchange_rate || 0) !== Number(updates.exchange_rate || 0) ||
    Number(currentConverted || 0) !== Number(updates.converted_amount || 0);

  if (!changed) {
    return null;
  }

  return updates;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  if (APPLY && isLikelyProdUrl(supabaseUrl) && !CONFIRM_PROD) {
    throw new Error('Refusing to apply invoice OCR backfill without --confirm-prod on a non-local Supabase target');
  }

  const model = env.OPENAI_MODEL || DEFAULT_MODEL;
  const openaiClient = getOpenAiClient(env);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const invoices = await fetchInvoices(supabase);

  const summary = {
    mode: APPLY ? 'apply' : 'dry-run',
    target: supabaseUrl,
    model,
    scanned: invoices.length,
    candidates: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    changes: [],
    failures: [],
  };

  for (const invoice of invoices) {
    const extraction = await fetchDocumentAndExtract(supabase, openaiClient, invoice, model);

    if (!extraction.ok) {
      summary.failed += 1;
      summary.failures.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        reason: extraction.reason,
      });
      continue;
    }

    const updates = buildInvoiceUpdates(invoice, extraction.extracted);
    if (!updates) {
      summary.skipped += 1;
      continue;
    }

    summary.candidates += 1;
    summary.changes.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      extractedInvoiceNumber: extraction.extracted.invoiceNumber,
      from: {
        gross_amount: invoice.gross_amount,
        net_amount: invoice.net_amount,
        source_currency: invoice.source_currency,
        target_currency: invoice.target_currency,
        exchange_rate: invoice.exchange_rate,
        converted_amount: invoice.converted_amount,
      },
      to: updates,
    });

    if (!APPLY) {
      continue;
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoice.id)
      .is('deleted_at', null);

    if (updateError) {
      summary.failed += 1;
      summary.failures.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        reason: updateError.message,
      });
      continue;
    }

    summary.updated += 1;
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[backfill-invoice-php-amounts] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});