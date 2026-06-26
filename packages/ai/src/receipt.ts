import OpenAI from 'openai';

export interface ReceiptExtractionFieldConfidence {
  vendorName: number;
  transactionDate: number;
  totalAmount: number;
  taxAmount: number;
}

export interface ReceiptExtractionResult {
  vendorName: string;
  transactionDate: string;
  totalAmount: number;
  taxAmount: number;
  currency: string;
  fieldConfidence: ReceiptExtractionFieldConfidence;
  model: string;
}

export interface ReceiptExtractionConfig {
  apiKey?: string;
  model?: string;
}

const DEFAULT_RECEIPT_MODEL = 'gpt-4o-mini';

const RECEIPT_RESPONSE_JSON_SCHEMA = {
  name: 'receipt_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      vendorName: { type: 'string' },
      transactionDate: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
      totalAmount: { type: 'number' },
      taxAmount: { type: 'number' },
      currency: {
        type: 'string',
        pattern: '^[A-Z]{3}$',
      },
      fieldConfidence: {
        type: 'object',
        additionalProperties: false,
        properties: {
          vendorName: { type: 'number', minimum: 0, maximum: 1 },
          transactionDate: { type: 'number', minimum: 0, maximum: 1 },
          totalAmount: { type: 'number', minimum: 0, maximum: 1 },
          taxAmount: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['vendorName', 'transactionDate', 'totalAmount', 'taxAmount'],
      },
    },
    required: [
      'vendorName',
      'transactionDate',
      'totalAmount',
      'taxAmount',
      'currency',
      'fieldConfidence',
    ],
  },
} as const;

const RECEIPT_SYSTEM_PROMPT = `You extract receipt metadata for accounting draft entries.
Return only the required JSON schema output.

Extraction rules:
- vendorName: merchant or issuing business name as shown on receipt.
- transactionDate: date in YYYY-MM-DD.
- totalAmount: final total paid, numeric only.
- taxAmount: explicit tax/VAT amount. If missing, use 0.
- currency: ISO 4217 code in uppercase (e.g. USD, PHP, EUR).
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

  return {
    ...parsed,
    model,
  };
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
