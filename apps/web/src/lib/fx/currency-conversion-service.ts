import type { SupabaseClient } from '@supabase/supabase-js';
import { convertExpenseAmountsToAud, detectExpenseCurrency } from '@/lib/fx/expense-conversion';

export type CurrencyRateResolution = {
  sourceCurrency: string;
  exchangeRateToAud: number;
  fxRatesFetchedAt: string | null;
  fxSource: 'cached_fx_rates' | 'base_currency';
  resolvedFrom: 'cache' | 'base_currency';
};

export type CurrencyConversionResult = CurrencyRateResolution & {
  totalAmountAud: number;
  taxAmountAud: number;
};

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
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
