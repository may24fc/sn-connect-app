import {
  christmasOrnamentDeleteSchema,
  christmasOrnamentMoveSchema,
  christmasOrnamentPlacementSchema,
} from '@/lib/schemas/christmas-tree.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  ChristmasTreeRequestError,
  buildChristmasTreeSnapshot,
  deleteChristmasOrnament,
  getChristmasTreeAdminClient,
  getChristmasTreeAuth,
  moveChristmasOrnament,
  placeChristmasOrnament,
} from '../_lib';

export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getChristmasTreeAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = christmasOrnamentPlacementSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );

    const adminClient = getChristmasTreeAdminClient();
    await placeChristmasOrnament(
      adminClient,
      user.id,
      parsed.data.assetType,
      parsed.data.positionX,
      parsed.data.positionY
    );
    return NextResponse.json(
      { data: await buildChristmasTreeSnapshot(adminClient, user.id, role) },
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

export async function DELETE(request: NextRequest) {
  try {
    const { user, role } = await getChristmasTreeAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = christmasOrnamentDeleteSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );

    const adminClient = getChristmasTreeAdminClient();
    const canManage = role === 'admin' || role === 'super_admin';
    await deleteChristmasOrnament(adminClient, user.id, parsed.data.ornamentId, canManage);
    return NextResponse.json({
      data: await buildChristmasTreeSnapshot(adminClient, user.id, role),
    });
  } catch (error) {
    const status = error instanceof ChristmasTreeRequestError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, role } = await getChristmasTreeAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = christmasOrnamentMoveSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );

    const adminClient = getChristmasTreeAdminClient();
    await moveChristmasOrnament(adminClient, user.id, parsed.data.positionX, parsed.data.positionY);
    return NextResponse.json({
      data: await buildChristmasTreeSnapshot(adminClient, user.id, role),
    });
  } catch (error) {
    const status = error instanceof ChristmasTreeRequestError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status }
    );
  }
}
