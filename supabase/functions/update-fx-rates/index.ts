// supabase/functions/update-fx-rates/index.ts
// Supabase Edge Function - Deno runtime
// Trigger: Cron job (daily at 00:00 UTC)
// Purpose: Fetch latest FX rates from Open Exchange Rates API and cache in database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const OPEN_EXCHANGE_RATES_URL = 'https://openexchangerates.org/api/latest.json';

interface OXRResponse {
  disclaimer: string;
  license: string;
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

Deno.serve(async (req: Request) => {
  try {
    // Verify this is a POST request (from cron or manual trigger)
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPEN_EXCHANGE_RATES_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPEN_EXCHANGE_RATES_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch latest rates from Open Exchange Rates
    const response = await fetch(`${OPEN_EXCHANGE_RATES_URL}?app_id=${apiKey}`);
    if (!response.ok) {
      throw new Error(`OXR API error: ${response.status} ${response.statusText}`);
    }

    const oxrData: OXRResponse = await response.json();

    // Filter to only supported currencies
    const supportedCurrencies = ['PHP', 'USD', 'EUR', 'AUD', 'GBP', 'SGD', 'JPY'];
    const filteredRates: Record<string, number> = {};
    for (const code of supportedCurrencies) {
      if (oxrData.rates[code] !== undefined) {
        filteredRates[code] = oxrData.rates[code];
      }
    }

    // Store in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('fx_rates')
      .insert({
        base_currency: oxrData.base,
        rates: filteredRates,
        fetched_at: new Date(oxrData.timestamp * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'FX rates updated successfully',
        rates_count: Object.keys(filteredRates).length,
        fetched_at: data.fetched_at,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
