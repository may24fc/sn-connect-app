import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unit = searchParams.get('unit');
    const type = searchParams.get('type');

    const supabase = createSupabaseServerClient();

    let query = supabase
      .from('job_postings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (unit) {
      query = query.eq('business_unit_id', unit);
    }
    if (type) {
      query = query.eq('employment_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Jobs fetch error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
