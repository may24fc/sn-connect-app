import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/calendar/disconnect
 *
 * Disconnects the user's Google Calendar by clearing stored OAuth tokens.
 */
export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Revoke the access token at Google (best-effort)
    const gcal = user.app_metadata?.google_calendar as { access_token?: string } | undefined;
    if (gcal?.access_token) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${gcal.access_token}`, {
        method: 'POST',
      }).catch(() => {
        // Best-effort; ignore errors
      });
    }

    // Clear stored tokens
    const supabaseAdmin = createSupabaseAdminClient();

    // Preserve existing app_metadata but remove google_calendar
    const existingMetadata = { ...user.app_metadata };
    delete existingMetadata.google_calendar;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: existingMetadata,
    });

    if (updateError) {
      console.error('[calendar/disconnect] Failed to clear tokens:', updateError);
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[calendar/disconnect] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
