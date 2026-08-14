import { NextResponse } from 'next/server';
import { getPaTaskAuthedContext } from '../_lib';

export async function GET() {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { role, hasGrant, accessLevel, canAccess, canManage } = auth.context;

    return NextResponse.json({
      data: {
        canAccess,
        canManage,
        hasGrant,
        accessLevel,
        role,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/pa-tasks/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
