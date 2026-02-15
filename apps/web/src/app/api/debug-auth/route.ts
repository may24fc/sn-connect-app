import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// TEMPORARY debug endpoint - remove after fixing auth
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Step 1: Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        step: 'auth',
        error: authError?.message ?? 'No user',
        user: null,
      });
    }

    // Step 2: Check public.users row
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Step 3: Try without deleted_at filter
    const { data: roleDataNoFilter, error: roleErrorNoFilter } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({
      step: 'complete',
      authUser: {
        id: user.id,
        email: user.email,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      },
      publicUsersRow: roleData,
      publicUsersError: roleError?.message ?? null,
      publicUsersRowNoFilter: roleDataNoFilter,
      publicUsersErrorNoFilter: roleErrorNoFilter?.message ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
