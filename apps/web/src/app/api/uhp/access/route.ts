import { UHP_MODULE_VALUES } from '@/lib/uhp';
import { NextResponse } from 'next/server';
import { getUhpAuthedContext, isUhpAdmin } from '../_lib';

export async function GET() {
  const auth = await getUhpAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const grantedModules = isUhpAdmin(auth.context.role)
    ? [...UHP_MODULE_VALUES]
    : auth.context.grantedModules;
  return NextResponse.json({
    data: {
      canAccess: grantedModules.length > 0,
      grantedModules,
      isAdmin: isUhpAdmin(auth.context.role),
    },
  });
}
