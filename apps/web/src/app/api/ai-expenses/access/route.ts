import { NextResponse } from 'next/server';
import { getAiSpendingAuth, hasAiSpendingAccess } from '@/app/api/ai-expenses/_lib';

export async function GET() {
  try {
    const { user, role, hasGrant, error } = await getAiSpendingAuth();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        canAccess: hasAiSpendingAccess(role, hasGrant),
        hasGrant,
        role,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/ai-expenses/access:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
