import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getWorkspaceLandingPath, type WorkspaceKey } from '@/lib/workspace-access';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLandingPage() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const { data } = await supabase
    .from('workspace_access_grants')
    .select('workspace')
    .eq('user_id', auth.user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data?.workspace) redirect('/account-disabled');
  redirect(getWorkspaceLandingPath(data.workspace as WorkspaceKey));
}
