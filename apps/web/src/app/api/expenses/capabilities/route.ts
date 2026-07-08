import { resolveExpenseCapabilities } from '@/lib/expenses/capabilities';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/expenses/capabilities
 * Returns server-authoritative expense permissions for the current user.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const adminClient = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capabilities = await resolveExpenseCapabilities(adminClient, user.id);

    return NextResponse.json({ data: capabilities });
  } catch {
    return NextResponse.json({ error: 'Failed to resolve expense capabilities' }, { status: 500 });
  }
}
