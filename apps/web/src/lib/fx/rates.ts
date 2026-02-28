import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export interface FXRates {
  id: string;
  base_currency: string;
  rates: Record<string, number>;
  fetched_at: string;
  created_at: string;
}

/** Supported currencies with metadata */
export const SUPPORTED_CURRENCIES = [
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭', locale: 'en-PH' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', locale: 'de-DE' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', locale: 'en-AU' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', locale: 'en-GB' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', locale: 'en-SG' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', locale: 'ja-JP' },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code'];

/**
 * Get the latest cached exchange rates from Supabase.
 * Rates are stored relative to USD as base currency.
 */
export async function getLatestRates(): Promise<FXRates | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('fx_rates')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as FXRates;
}

/**
 * Get the exchange rate between two currencies.
 * Uses USD as the intermediate base currency.
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const fxData = await getLatestRates();
  if (!fxData) throw new Error('Exchange rates not available');

  const rates = fxData.rates;
  const fromRate = from === 'USD' ? 1 : rates[from];
  const toRate = to === 'USD' ? 1 : rates[to];

  if (!fromRate || !toRate) {
    throw new Error(`Exchange rate not available for ${from}/${to}`);
  }

  return toRate / fromRate;
}

/**
 * Convert an amount from one currency to another.
 */
export async function convertAmount(amount: number, from: string, to: string): Promise<number> {
  const rate = await getExchangeRate(from, to);
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Get a list of supported currency codes.
 */
export function getSupportedCurrencies(): string[] {
  return SUPPORTED_CURRENCIES.map((c) => c.code);
}

/**
 * Format a monetary amount with the appropriate currency symbol and locale.
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  const locale = currency?.locale || 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
  }).format(amount || 0);
}

/**
 * Get the exchange rate display text (e.g., "1 USD = 55.50 PHP").
 */
export async function getExchangeRateText(from: string, to: string): Promise<string> {
  try {
    const rate = await getExchangeRate(from, to);
    return `1 ${from} = ${rate.toFixed(4)} ${to}`;
  } catch {
    return '';
  }
}
