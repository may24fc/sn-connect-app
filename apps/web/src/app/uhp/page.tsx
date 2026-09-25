import { getUhpAuthedContext, isUhpAdmin } from '@/app/api/uhp/_lib';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const auth = await getUhpAuthedContext();
  if (!auth.ok) redirect('/login');
  const modules = isUhpAdmin(auth.context.role) ? ['client_tracker'] : auth.context.grantedModules;
  if (modules.includes('client_tracker')) redirect('/uhp/clients');
  if (modules.includes('portal_reminders')) redirect('/uhp/reminders');
  if (modules.includes('volume_points')) redirect('/uhp/volume-points');
  redirect('/dashboard');
}
