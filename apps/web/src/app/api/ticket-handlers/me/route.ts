import { NextResponse } from 'next/server';
import { getTicketAuthedContext } from '../../tickets/_lib';

export async function GET() {
  try {
    const auth = await getTicketAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    return NextResponse.json({
      data: {
        isItHandler: auth.context.isItHandler,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/ticket-handlers/me:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}