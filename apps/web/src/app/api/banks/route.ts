import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

interface BankRegistryRow {
  id: string;
  bank_name: string | null;
  bank_code: string | null;
  swift_code: string | null;
  country_code: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country_code');

    let query = supabase
      .from('bank_registry')
      .select('id, bank_name, bank_code, swift_code, country_code')
      .eq('is_active', true)
      .order('bank_name', { ascending: true });

    if (countryCode) {
      // Include banks matching the country code AND global banks
      query = query.or(`country_code.eq.${countryCode},country_code.eq.GLOBAL`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch banks' },
        { status: 500 }
      );
    }

    const filteredBanks = ((data || []) as BankRegistryRow[]).filter((bank) => {
      const normalizedName = String(bank.bank_name || '').toLowerCase();
      const normalizedCode = String(bank.bank_code || '').toLowerCase();

      return !normalizedName.includes('wise') && normalizedCode !== 'wise';
    });

    return NextResponse.json(
      { data: filteredBanks },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
