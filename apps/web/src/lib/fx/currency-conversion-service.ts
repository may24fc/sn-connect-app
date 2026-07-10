import type { SupabaseClient } from '@supabase/supabase-js';
import { convertExpenseAmountsToAud, detectExpenseCurrency } from '@/lib/fx/expense-conversion';

const WISE_PUBLIC_RATES_URL = 'https://api.wise.com/v1/rates?source=PHP&target=AUD';
const WISE_RATE_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

type WisePublicRateCacheEntry = {
  exchangeRateToAud: number;
  fetchedAt: string;
  expiresAt: number;
};

let wisePublicPhpAudRateCache: WisePublicRateCacheEntry | null = null;

export type CurrencyRateResolution = {
  sourceCurrency: string;
  exchangeRateToAud: number;
  fxRatesFetchedAt: string | null;
  fxSource: 'cached_fx_rates' | 'base_currency' | 'wise_public';
  resolvedFrom: 'cache' | 'base_currency' | 'wise_public';
};

export type CurrencyConversionResult = CurrencyRateResolution & {
  totalAmountAud: number;
  taxAmountAud: number;
};

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundFxRate(value: number): number {
  return Math.round(value * 100000000) / 100000000;
}

async function fetchWisePublicPhpAudRate(): Promise<WisePublicRateCacheEntry> {
  const now = Date.now();

  if (wisePublicPhpAudRateCache && wisePublicPhpAudRateCache.expiresAt > now) {
    return wisePublicPhpAudRateCache;
  }

  const response = await fetch(WISE_PUBLIC_RATES_URL, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Wise public rate lookup failed (${response.status})`);
  }

  const payload = (await response.json()) as Array<{ rate?: number; value?: number }>;
  const firstRate = payload[0];
  const parsedRate = Number(firstRate?.rate ?? firstRate?.value);

  if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
    throw new Error('Wise public rate lookup returned an invalid PHP to AUD rate.');
  }

  const fetchedAt = new Date().toISOString();
  wisePublicPhpAudRateCache = {
    exchangeRateToAud: roundFxRate(parsedRate),
    fetchedAt,
    expiresAt: now + WISE_RATE_CACHE_TTL_MS,
  };

  return wisePublicPhpAudRateCache;
}

export class CurrencyConversionService {
  constructor(private readonly adminClient: SupabaseClient) {}

  async getRateToAud(sourceCurrency: string): Promise<CurrencyRateResolution> {
    const normalizedCurrency = detectExpenseCurrency(sourceCurrency).currencyCode;

    if (normalizedCurrency === 'AUD') {
      return {
        sourceCurrency: 'AUD',
        exchangeRateToAud: 1,
        fxRatesFetchedAt: null,
        fxSource: 'base_currency',
        resolvedFrom: 'base_currency',
      };
    }

    if (normalizedCurrency === 'PHP') {
      const wiseRate = await fetchWisePublicPhpAudRate();

      return {
        sourceCurrency: 'PHP',
        exchangeRateToAud: wiseRate.exchangeRateToAud,
        fxRatesFetchedAt: wiseRate.fetchedAt,
        fxSource: 'wise_public',
        resolvedFrom: 'wise_public',
      };
    }

    try {
      const conversion = await convertExpenseAmountsToAud(this.adminClient, {
        sourceCurrency: normalizedCurrency,
        totalAmount: 1,
        taxAmount: 0,
      });

      return {
        sourceCurrency: conversion.currency,
        exchangeRateToAud: conversion.exchangeRateToAud,
        fxRatesFetchedAt: conversion.fxRatesFetchedAt,
        fxSource: conversion.fxSource,
        resolvedFrom: 'cache',
      };
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Exchange rates are unavailable from the cached FX snapshot.');
    }
  }

  async convertToAud(input: {
    sourceCurrency: string;
    totalAmount: number;
    taxAmount: number;
  }): Promise<CurrencyConversionResult> {
    const rate = await this.getRateToAud(input.sourceCurrency);

    return {
      ...rate,
      totalAmountAud: roundToCents(input.totalAmount * rate.exchangeRateToAud),
      taxAmountAud: roundToCents(input.taxAmount * rate.exchangeRateToAud),
    };
  }
}
