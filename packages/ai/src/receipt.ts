import OpenAI from 'openai';

export interface ReceiptExtractionFieldConfidence {
  vendorName: number;
  invoiceNumber: number;
  transactionDate: number;
  totalAmount: number;
  taxAmount: number;
  currency: number;
}

export interface ReceiptExtractionResult {
  vendorName: string;
  invoiceNumber: string | null;
  transactionDate: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  /** PHP (₱) amount explicitly printed on the invoice, or null if not present. */
  phpAmount: number | null;
  /** AUD (A$) amount explicitly printed on the invoice, or null if not present. */
  audAmount: number | null;
  fieldConfidence: ReceiptExtractionFieldConfidence;
  model: string;
}

export interface ReceiptExtractionConfig {
  apiKey?: string;
  model?: string;
}

const DEFAULT_RECEIPT_MODEL = 'gpt-4o-mini';
const SUPPORTED_CURRENCY_CODES = ['PHP', 'USD', 'EUR', 'AUD', 'GBP', 'SGD', 'JPY'] as const;

const CURRENCY_SYMBOL_TO_CODE: Record<string, (typeof SUPPORTED_CURRENCY_CODES)[number]> = {
  '$': 'USD',
  'A$': 'AUD',
  'US$': 'USD',
  'S$': 'SGD',
  '£': 'GBP',
  '€': 'EUR',
  '¥': 'JPY',
  PHP: 'PHP',
  AUD: 'AUD',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  SGD: 'SGD',
  JPY: 'JPY',
};

const RECEIPT_RESPONSE_JSON_SCHEMA = {
  name: 'receipt_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      vendorName: { type: 'string' },
      invoiceNumber: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      transactionDate: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
      totalAmount: { type: 'number' },
      taxAmount: { type: 'number' },
      currency: {
        type: 'string',
        enum: SUPPORTED_CURRENCY_CODES,
      },
      phpAmount: { anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }] },
      audAmount: { anyOf: [{ type: 'number', minimum: 0 }, { type: 'null' }] },
      fieldConfidence: {
        type: 'object',
        additionalProperties: false,
        properties: {
          vendorName: { type: 'number', minimum: 0, maximum: 1 },
          invoiceNumber: { type: 'number', minimum: 0, maximum: 1 },
          transactionDate: { type: 'number', minimum: 0, maximum: 1 },
          totalAmount: { type: 'number', minimum: 0, maximum: 1 },
          taxAmount: { type: 'number', minimum: 0, maximum: 1 },
          currency: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['vendorName', 'invoiceNumber', 'transactionDate', 'totalAmount', 'taxAmount', 'currency'],
      },
    },
    required: [
      'vendorName',
      'invoiceNumber',
      'transactionDate',
      'totalAmount',
      'taxAmount',
      'currency',
      'phpAmount',
      'audAmount',
      'fieldConfidence',
    ],
  },
} as const;

const RECEIPT_SYSTEM_PROMPT = `You extract invoice/receipt metadata for accounting draft entries.
Return only the required JSON schema output.

Extraction rules:
- vendorName: merchant or issuing business name as shown on the document.
- invoiceNumber: the invoice number exactly as shown on the document, without inventing or reformatting it. If no invoice number is visible, return null.
- transactionDate: date in YYYY-MM-DD.
- totalAmount: the primary final total paid, numeric only.
- taxAmount: explicit tax/VAT amount. If missing, use 0.
- Identify the primary currency symbol or text and return its standard 3-letter ISO 4217 code.
- currency: one of PHP, USD, EUR, AUD, GBP, SGD, JPY.
- phpAmount: if a Philippine Peso (₱ or PHP) total amount is explicitly shown anywhere on the document, return it as a positive number. Otherwise return null.
- audAmount: if an Australian Dollar (A$ or AUD) total amount is explicitly shown anywhere on the document, return it as a positive number. Otherwise return null.
- fieldConfidence values: between 0 and 1 and represent confidence per field.

Do not add extra fields.`;

function getClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return new OpenAI({ apiKey: key });
}

function parseReceiptResponse(content: string | null, model: string): ReceiptExtractionResult {
  if (!content) {
    throw new Error('LLM returned empty receipt extraction response');
  }

  let parsed: Omit<ReceiptExtractionResult, 'model'>;
  try {
    parsed = JSON.parse(content) as Omit<ReceiptExtractionResult, 'model'>;
  } catch (error) {
    throw new Error(`Failed to parse receipt extraction JSON: ${(error as Error).message}`);
  }

  const normalizedCurrency = normalizeExtractedCurrency(parsed.currency);

  return {
    ...parsed,
    currency: normalizedCurrency,
    model,
  };
}

function normalizeExtractedCurrency(raw: string | null | undefined): string {
  if (!raw) {
    return 'AUD';
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return 'AUD';
  }

  const upper = trimmed.toUpperCase();

  if (SUPPORTED_CURRENCY_CODES.includes(upper as (typeof SUPPORTED_CURRENCY_CODES)[number])) {
    return upper;
  }

  if (CURRENCY_SYMBOL_TO_CODE[trimmed]) {
    return CURRENCY_SYMBOL_TO_CODE[trimmed];
  }

  if (CURRENCY_SYMBOL_TO_CODE[upper]) {
    return CURRENCY_SYMBOL_TO_CODE[upper];
  }

  return 'AUD';
}

export async function extractReceiptFromText(
  text: string,
  config: ReceiptExtractionConfig = {}
): Promise<ReceiptExtractionResult> {
  const client = getClient(config.apiKey);
  const model = config.model ?? DEFAULT_RECEIPT_MODEL;

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: RECEIPT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract receipt data from this OCR text:\n\n${text}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: RECEIPT_RESPONSE_JSON_SCHEMA,
    },
  });

  return parseReceiptResponse(response.choices[0]?.message?.content ?? null, model);
}

export async function extractReceiptFromImage(
  imageBase64: string,
  mimeType: string,
  config: ReceiptExtractionConfig = {}
): Promise<ReceiptExtractionResult> {
  const client = getClient(config.apiKey);
  const model = config.model ?? DEFAULT_RECEIPT_MODEL;

  const response = await client.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      { role: 'system', content: RECEIPT_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract receipt data from this image.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: RECEIPT_RESPONSE_JSON_SCHEMA,
    },
  });

  return parseReceiptResponse(response.choices[0]?.message?.content ?? null, model);
}
