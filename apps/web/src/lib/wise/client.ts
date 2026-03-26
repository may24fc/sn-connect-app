/**
 * Wise (TransferWise) API Client
 *
 * Handles all communication with the Wise API.
 * Uses environment-based configuration for sandbox/production switching.
 *
 * SECURITY: This module runs server-side ONLY. The API token is never
 * exposed to the client. All calls go through server actions or API routes.
 */

const WISE_API_TOKEN = process.env.WISE_API_KEY ?? '';
const WISE_PROFILE_ID = process.env.WISE_PROFILE_ID ?? '';
const WISE_ENVIRONMENT = process.env.WISE_ENVIRONMENT ?? 'sandbox';

const BASE_URL =
  WISE_ENVIRONMENT === 'production'
    ? 'https://api.transferwise.com'
    : 'https://api.sandbox.transferwise.tech';

function assertConfigured(): void {
  if (!WISE_API_TOKEN) {
    throw new Error('WISE_API_KEY is not configured.');
  }
  if (!WISE_PROFILE_ID) {
    throw new Error('WISE_PROFILE_ID is not configured.');
  }
}

interface WiseRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  idempotencyKey?: string;
}

/**
 * Low-level fetch wrapper for Wise API.
 * Handles authentication, idempotency headers, and error extraction.
 */
async function wiseRequest<T>(opts: WiseRequestOptions): Promise<T> {
  assertConfigured();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${WISE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };

  if (opts.idempotencyKey) {
    headers['X-Idempotency-Key'] = opts.idempotencyKey;
  }

  const res = await fetch(`${BASE_URL}${opts.path}`, {
    method: opts.method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : null,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new WiseApiError(
      `Wise API ${opts.method} ${opts.path} failed (${res.status})`,
      res.status,
      errorBody
    );
  }

  return res.json() as Promise<T>;
}

// ────────────────────────────────────────────────────────────
// Error class
// ────────────────────────────────────────────────────────────

export class WiseApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string
  ) {
    super(message);
    this.name = 'WiseApiError';
  }
}

// ────────────────────────────────────────────────────────────
// Type definitions (Wise API response shapes)
// ────────────────────────────────────────────────────────────

export interface WiseQuote {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  status: string;
  expirationTime: string;
}

export interface WiseRecipient {
  id: number;
  profile: number;
  accountHolderName: string;
  currency: string;
  country: string;
  type: string;
  details: Record<string, unknown>;
}

export interface WiseTransfer {
  id: number;
  targetAccount: number;
  quoteUuid: string;
  status: string;
  reference: string;
  rate: number;
  sourceCurrency: string;
  targetCurrency: string;
  sourceValue: number;
  targetValue: number;
  customerTransactionId: string;
}

export interface WiseFundResponse {
  type: string;
  status: string;
  errorCode: string | null;
}

// ────────────────────────────────────────────────────────────
// Public API functions
// ────────────────────────────────────────────────────────────

/**
 * Step 1: Create a quote for the transfer amount.
 * This locks in the exchange rate and fee for a limited time.
 */
export async function createQuote(params: {
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount?: number;
  targetAmount?: number;
}): Promise<WiseQuote> {
  return wiseRequest<WiseQuote>({
    method: 'POST',
    path: '/v3/profiles/' + WISE_PROFILE_ID + '/quotes',
    body: {
      sourceCurrency: params.sourceCurrency,
      targetCurrency: params.targetCurrency,
      sourceAmount: params.sourceAmount ?? null,
      targetAmount: params.targetAmount ?? null,
    },
  });
}

/**
 * Step 2: Create a transfer using the quote and recipient.
 * The idempotency key prevents double-creation if retried.
 */
export async function createTransfer(params: {
  targetAccount: number;
  quoteUuid: string;
  customerTransactionId: string;
  reference?: string;
}): Promise<WiseTransfer> {
  return wiseRequest<WiseTransfer>({
    method: 'POST',
    path: '/v1/transfers',
    idempotencyKey: params.customerTransactionId,
    body: {
      targetAccount: params.targetAccount,
      quoteUuid: params.quoteUuid,
      customerTransactionId: params.customerTransactionId,
      details: {
        reference: params.reference ?? 'SN Connect Payroll',
      },
    },
  });
}

/**
 * Step 3: Fund the transfer (Sandbox auto-completes; Production debits balance).
 */
export async function fundTransfer(
  transferId: number
): Promise<WiseFundResponse> {
  return wiseRequest<WiseFundResponse>({
    method: 'POST',
    path: `/v3/profiles/${WISE_PROFILE_ID}/transfers/${transferId}/payments`,
    body: { type: 'BALANCE' },
  });
}

/**
 * Get the current status of a transfer.
 */
export async function getTransferStatus(
  transferId: number
): Promise<WiseTransfer> {
  return wiseRequest<WiseTransfer>({
    method: 'GET',
    path: `/v1/transfers/${transferId}`,
  });
}

/**
 * Cancel a pending transfer.
 */
export async function cancelTransfer(
  transferId: number
): Promise<WiseTransfer> {
  return wiseRequest<WiseTransfer>({
    method: 'PUT',
    path: `/v1/transfers/${transferId}/cancel`,
  });
}

/**
 * Create a recipient account on Wise.
 */
export async function createRecipient(params: {
  accountHolderName: string;
  currency: string;
  type: string;
  details: Record<string, unknown>;
}): Promise<WiseRecipient> {
  return wiseRequest<WiseRecipient>({
    method: 'POST',
    path: '/v1/accounts',
    body: {
      profile: Number(WISE_PROFILE_ID),
      accountHolderName: params.accountHolderName,
      currency: params.currency,
      type: params.type,
      details: params.details,
    },
  });
}

/**
 * List existing recipients.
 */
export async function listRecipients(): Promise<WiseRecipient[]> {
  return wiseRequest<WiseRecipient[]>({
    method: 'GET',
    path: `/v1/accounts?profile=${WISE_PROFILE_ID}`,
  });
}

/**
 * Get the Wise profile ID from env. Useful for logging/diagnostics.
 */
export function getProfileId(): string {
  assertConfigured();
  return WISE_PROFILE_ID;
}

export function getBaseUrl(): string {
  return BASE_URL;
}
