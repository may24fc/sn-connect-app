import { CurrencyConversionService } from '@/lib/fx/currency-conversion-service';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionAudConversion = {
  monthly_amount_aud: number | null;
  billing_fx_rate: number | null;
  billing_fx_converted_at: string | null;
};

/**
 * Converts a subscription's billing amount to the AUD run-rate amount. Non-AUD amounts stay
 * unknown (null) when no rate is available, so foreign face values are never labelled as AUD.
 */
export async function convertSubscriptionToAud(
  admin: SupabaseClient,
  billingAmount: number | null,
  billingCurrency: string
): Promise<SubscriptionAudConversion> {
  if (billingAmount === null) {
    return { monthly_amount_aud: null, billing_fx_rate: null, billing_fx_converted_at: null };
  }
  if (billingCurrency === 'AUD') {
    return { monthly_amount_aud: billingAmount, billing_fx_rate: 1, billing_fx_converted_at: null };
  }
  try {
    const rate = await new CurrencyConversionService(admin).getRateToAud(billingCurrency);
    return {
      monthly_amount_aud: Math.round(billingAmount * rate.exchangeRateToAud * 100) / 100,
      billing_fx_rate: rate.exchangeRateToAud,
      billing_fx_converted_at: new Date().toISOString(),
    };
  } catch {
    return { monthly_amount_aud: null, billing_fx_rate: null, billing_fx_converted_at: null };
  }
}
