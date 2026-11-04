// supabase/functions/update-fx-rates/index.ts
// Supabase Edge Function - Deno runtime
// Trigger: n8n cron (daily) or manual POST. Optional JSON body { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
// backfills historical daily rates from Frankfurter.
// Purpose: cache free, no-key daily exchange rates (AUD base) and refresh expense AUD estimates.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';
import { validateAdminAuthFlexible } from '../_shared/auth.ts';

const SUPPORTED_CURRENCIES = ['USD', 'PHP', 'EUR', 'GBP', 'SGD', 'JPY'];
const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1';
const EXCHANGERATE_API_URL = 'https://open.er-api.com/v6/latest/AUD';
const MAX_BACKFILL_DAYS = 400;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DailyRates = { provider: string; rateDate: string; rates: Record<string, number> };

function pickSupported(rates: Record<string, unknown>): Record<string, number> {
  const picked: Record<string, number> = { AUD: 1 };
  for (const code of SUPPORTED_CURRENCIES) {
    const value = Number(rates[code]);
    if (Number.isFinite(value) && value > 0) picked[code] = value;
  }
  return picked;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${new URL(url).host} returned ${response.status}`);
  return response.json();
}

async function fetchFrankfurter(from?: string, to?: string): Promise<DailyRates[]> {
  const symbols = SUPPORTED_CURRENCIES.join(',');
  if (from) {
    const data = (await fetchJson(
      `${FRANKFURTER_URL}/${from}..${to ?? ''}?base=AUD&symbols=${symbols}`
    )) as { rates?: Record<string, Record<string, unknown>> };
    return Object.entries(data.rates ?? {}).map(([rateDate, rates]) => ({
      provider: 'frankfurter',
      rateDate,
      rates: pickSupported(rates),
    }));
  }
  const data = (await fetchJson(`${FRANKFURTER_URL}/latest?base=AUD&symbols=${symbols}`)) as {
    date?: string;
    rates?: Record<string, unknown>;
  };
  if (!data.date || !data.rates) throw new Error('Frankfurter returned an unexpected response');
  return [{ provider: 'frankfurter', rateDate: data.date, rates: pickSupported(data.rates) }];
}

async function fetchExchangeRateApi(): Promise<DailyRates[]> {
  const data = (await fetchJson(EXCHANGERATE_API_URL)) as {
    result?: string;
    time_last_update_unix?: number;
    rates?: Record<string, unknown>;
  };
  if (data.result !== 'success' || !data.rates || !data.time_last_update_unix) {
    throw new Error('ExchangeRate-API returned an unexpected response');
  }
  const rateDate = new Date(data.time_last_update_unix * 1000).toISOString().slice(0, 10);
  return [{ provider: 'exchangerate_api', rateDate, rates: pickSupported(data.rates) }];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const auth = await validateAdminAuthFlexible(req);
    if (!auth.ok) return json({ error: auth.error }, 401);

    const body = (await req.json().catch(() => ({}))) as { from?: unknown; to?: unknown };
    const from = typeof body.from === 'string' ? body.from : undefined;
    const to = typeof body.to === 'string' ? body.to : undefined;
    if ((from && !DATE_PATTERN.test(from)) || (to && !DATE_PATTERN.test(to)) || (to && !from)) {
      return json({ error: 'from/to must be YYYY-MM-DD, and to requires from' }, 400);
    }
    if (from) {
      const days = (Date.parse(to ?? new Date().toISOString().slice(0, 10)) - Date.parse(from)) / 86_400_000;
      if (!(days >= 0 && days <= MAX_BACKFILL_DAYS)) {
        return json({ error: `Backfill range must be 0-${MAX_BACKFILL_DAYS} days` }, 400);
      }
    }

    const failures: string[] = [];
    let daily: DailyRates[] = [];
    try {
      daily = await fetchFrankfurter(from, to);
    } catch (error) {
      failures.push(`frankfurter: ${error instanceof Error ? error.message : 'failed'}`);
      // The fallback only publishes the latest day, so it cannot serve a historical backfill.
      if (!from) {
        try {
          daily = await fetchExchangeRateApi();
        } catch (fallbackError) {
          failures.push(
            `exchangerate_api: ${fallbackError instanceof Error ? fallbackError.message : 'failed'}`
          );
        }
      }
    }
    if (!daily.length) {
      console.error(`update-fx-rates: no provider available (${failures.join('; ')})`);
      return json({ error: 'No exchange-rate provider was available', providers: failures }, 502);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const fetchedAt = new Date().toISOString();
    const { error: upsertError } = await supabase.from('fx_rates').upsert(
      daily.map((row) => ({
        base_currency: 'AUD',
        rates: row.rates,
        provider: row.provider,
        rate_date: row.rateDate,
        fetched_at: fetchedAt,
      })),
      { onConflict: 'provider,rate_date' }
    );
    if (upsertError) throw new Error(`Supabase upsert error: ${upsertError.message}`);

    const { data: refreshed, error: refreshError } = await supabase.rpc(
      'finance_refresh_fx_estimates'
    );
    if (refreshError) throw new Error(`Estimate refresh error: ${refreshError.message}`);

    const dates = daily.map((row) => row.rateDate).sort();
    return json({
      success: true,
      message: 'FX rates updated successfully',
      provider: daily[0]?.provider,
      fallback_used: failures.length > 0,
      days: daily.length,
      first_rate_date: dates[0],
      last_rate_date: dates.at(-1),
      estimates_refreshed: refreshed ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`update-fx-rates error: ${message}`);
    return json({ error: 'Failed to update FX rates' }, 500);
  }
});
