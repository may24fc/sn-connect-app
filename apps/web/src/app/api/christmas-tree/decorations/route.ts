import {
  christmasDecorationEnableSchema,
  christmasStrandSaveSchema,
} from '@/lib/schemas/christmas-tree.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  ChristmasTreeRequestError,
  buildChristmasTreeSnapshot,
  canManageChristmasTree,
  enableChristmasDecoration,
  getChristmasTreeAdminClient,
  getChristmasTreeAuth,
  saveChristmasStrand,
} from '../_lib';

export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getChristmasTreeAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = christmasDecorationEnableSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = getChristmasTreeAdminClient();
    await enableChristmasDecoration(
      adminClient,
      user.id,
      parsed.data.decoration,
      canManageChristmasTree(role)
    );
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
    const parsed = christmasStrandSaveSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid strand position', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = getChristmasTreeAdminClient();
    await saveChristmasStrand(
      adminClient,
      user.id,
      parsed.data.decoration,
      parsed.data.geometry,
      canManageChristmasTree(role),
      parsed.data.strandId
    );
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
