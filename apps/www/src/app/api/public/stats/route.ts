import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export const revalidate = 3600; // cache for 1 hour

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    const [employeesResult, departmentsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('departments').select('id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      employees: employeesResult.count ?? 0,
      departments: departmentsResult.count ?? 0,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({
      employees: 0,
      departments: 0,
    });
  }
}
