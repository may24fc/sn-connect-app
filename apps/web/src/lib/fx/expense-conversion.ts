import type { SupabaseClient } from '@supabase/supabase-js';

const BASE_REPORTING_CURRENCY = 'AUD';
const FX_STALE_AFTER_HOURS = 48;

const CURRENCY_SYMBOL_TO_CODE: Record<string, string> = {
  '$': 'USD',
  'A$': 'AUD',
  'US$': 'USD',
  'S$': 'SGD',
  '£': 'GBP',
  '€': 'EUR',
  '¥': 'JPY',
  'PHP': 'PHP',
  'AUD': 'AUD',
  'USD': 'USD',
  'EUR': 'EUR',
  'GBP': 'GBP',
  'SGD': 'SGD',
  'JPY': 'JPY',
};

const SUPPORTED_CURRENCY_CODES = new Set(['PHP', 'USD', 'EUR', 'AUD', 'GBP', 'SGD', 'JPY']);

type FXRatesRow = {
  base_currency: string;
  rates: Record<string, number>;
  fetched_at: string;
};

export type CurrencyDetection = {
  currencyCode: string;
  source: 'ai_currency' | 'symbol_map' | 'default';
};

export type ConvertedExpenseAmounts = {
  currency: string;
  exchangeRateToAud: number;
  totalAmountAud: number;
  taxAmountAud: number;
  fxRatesFetchedAt: string;
  fxSource: 'cached_fx_rates';
};

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundFxRate(value: number): number {
  return Math.round(value * 100000000) / 100000000;
}

function normalizeCurrencyInput(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const upper = trimmed.toUpperCase();
  if (SUPPORTED_CURRENCY_CODES.has(upper)) {
    return upper;
  }

  if (CURRENCY_SYMBOL_TO_CODE[trimmed]) {
    return CURRENCY_SYMBOL_TO_CODE[trimmed];
  }

  if (CURRENCY_SYMBOL_TO_CODE[upper]) {
    return CURRENCY_SYMBOL_TO_CODE[upper];
  }

  return null;
}

export function detectExpenseCurrency(extractedCurrency: string | null | undefined): CurrencyDetection {
  const normalized = normalizeCurrencyInput(extractedCurrency);
  if (normalized) {
    return {
      currencyCode: normalized,
      source: SUPPORTED_CURRENCY_CODES.has((extractedCurrency ?? '').trim().toUpperCase())
        ? 'ai_currency'
        : 'symbol_map',
    };
  }

  return {
    currencyCode: BASE_REPORTING_CURRENCY,
    source: 'default',
  };
}

async function fetchLatestRates(adminClient: SupabaseClient): Promise<FXRatesRow> {
  const { data, error } = await adminClient
    .from('fx_rates')
    .select('base_currency, rates, fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('Exchange rates are unavailable. Run the FX update function first.');
  }

  return data as FXRatesRow;
}

function assertRatesFresh(fetchedAtIso: string): void {
  const fetchedAtMs = new Date(fetchedAtIso).getTime();
  const staleThresholdMs = Date.now() - FX_STALE_AFTER_HOURS * 60 * 60 * 1000;
  if (Number.isNaN(fetchedAtMs) || fetchedAtMs < staleThresholdMs) {
    throw new Error('Exchange rates are stale. Refresh FX rates before importing or extracting expenses.');
  }
}

function getRateFromBase(baseCurrency: string, rates: Record<string, number>, currency: string): number {
  if (currency === baseCurrency) {
    return 1;
  }

  const value = rates[currency];
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`Exchange rate not available for currency ${currency}.`);
  }

  return value;
}

export async function convertExpenseAmountsToAud(
  adminClient: SupabaseClient,
  input: {
    sourceCurrency: string;
    totalAmount: number;
    taxAmount: number;
  }
): Promise<ConvertedExpenseAmounts> {
  const sourceCurrency = detectExpenseCurrency(input.sourceCurrency).currencyCode;
  const fxRow = await fetchLatestRates(adminClient);
  assertRatesFresh(fxRow.fetched_at);

  const baseCurrency = fxRow.base_currency.toUpperCase();
  const sourceRateFromBase = getRateFromBase(baseCurrency, fxRow.rates, sourceCurrency);
  const audRateFromBase = getRateFromBase(baseCurrency, fxRow.rates, BASE_REPORTING_CURRENCY);

  const exchangeRateToAud = sourceCurrency === BASE_REPORTING_CURRENCY
    ? 1
    : audRateFromBase / sourceRateFromBase;

  return {
    currency: sourceCurrency,
    exchangeRateToAud: roundFxRate(exchangeRateToAud),
    totalAmountAud: roundToCents(input.totalAmount * exchangeRateToAud),
    taxAmountAud: roundToCents(input.taxAmount * exchangeRateToAud),
    fxRatesFetchedAt: fxRow.fetched_at,
    fxSource: 'cached_fx_rates',
  };
}
