import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'control_hub_activity_session';
const SESSION_MAX_AGE_SECONDS = 30 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieSessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId =
    cookieSessionId && UUID_PATTERN.test(cookieSessionId) ? cookieSessionId : crypto.randomUUID();

  const { error } = await supabase.rpc('record_hub_activity', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('Failed to record hub activity:', error);
    return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
