import type { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getAuthedPerformanceContext, isPerformanceAdmin } from '../_lib';

export type InsightRequestContext = {
  supabase: SupabaseClient;
  supabaseAdmin: SupabaseClient;
  user: User;
  role: string;
};

/**
 * Every insights route re-checks the performance-admin role on each request,
 * so a revoked role loses access to saved conversations immediately.
 */
export async function requireInsightAdmin(): Promise<
  { ok: true; context: InsightRequestContext } | { ok: false; response: NextResponse }
> {
  const { supabase, supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();

  if (error || !user || !role) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isPerformanceAdmin(role)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    ok: true,
    context: {
      supabase: supabase as unknown as SupabaseClient,
      supabaseAdmin,
      user,
      role,
    },
  };
}

export function notFoundResponse() {
  return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
}
