import { NextResponse } from 'next/server';
import { getCrmAuthedContext } from '@/app/api/crm/_lib';

export async function GET() {
  try {
    const auth = await getCrmAuthedContext();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    return NextResponse.json({
      data: {
        canAccess: true,
        grantedTrackers: auth.context.grantedTrackers,
        canWrite: auth.context.workspaceAccessLevel !== 'read',
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/crm/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
