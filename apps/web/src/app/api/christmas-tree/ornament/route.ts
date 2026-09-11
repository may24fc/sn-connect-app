import { christmasOrnamentPlacementSchema } from '@/lib/schemas/christmas-tree.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  ChristmasTreeRequestError,
  buildChristmasTreeSnapshot,
  getChristmasTreeAdminClient,
  getChristmasTreeAuth,
  placeChristmasOrnament,
} from '../_lib';

export async function POST(request: NextRequest) {
  try {
    const { user } = await getChristmasTreeAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = christmasOrnamentPlacementSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );

    const adminClient = getChristmasTreeAdminClient();
    await placeChristmasOrnament(adminClient, user.id, parsed.data.assetType);
    return NextResponse.json(
      { data: await buildChristmasTreeSnapshot(adminClient, user.id) },
      { status: 201 }
    );
  } catch (error) {
    const status = error instanceof ChristmasTreeRequestError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status }
    );
  }
}
