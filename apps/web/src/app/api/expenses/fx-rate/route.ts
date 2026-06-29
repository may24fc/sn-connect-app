import { CurrencyConversionService } from '@/lib/fx/currency-conversion-service';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sourceCurrency = request.nextUrl.searchParams.get('sourceCurrency');
    if (!sourceCurrency) {
      return NextResponse.json({ error: 'sourceCurrency is required' }, { status: 400 });
    }

    const conversionService = new CurrencyConversionService(createSupabaseAdminClient());
    const rate = await conversionService.getRateToAud(sourceCurrency);

    return NextResponse.json({ data: rate });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to resolve exchange rate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
