import { bingoBoardUpdateSchema } from '@/lib/schemas/bingo.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  buildWellnessBingoSnapshot,
  ensureBoard,
  getAuthedSupabase,
  getBingoAdminClient,
  resolveActiveCycle,
} from '../_lib';

export async function PATCH(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = bingoBoardUpdateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const adminClient = getBingoAdminClient();
    const cycle = await resolveActiveCycle(adminClient);

    if (!cycle) {
      return NextResponse.json(
        { error: 'No active wellness bingo cycle is configured' },
        { status: 404 }
      );
    }

    const board = await ensureBoard(adminClient, cycle, user.id, user.id);
    const nextTileState: Record<string, unknown> =
      board.tile_state && typeof board.tile_state === 'object'
        ? { ...(board.tile_state as Record<string, unknown>) }
        : {};

    if (parsed.data.tileId !== undefined && parsed.data.checked !== undefined) {
      nextTileState[parsed.data.tileId] = parsed.data.checked;
    }

    const updatePayload: Record<string, unknown> = {
      tile_state: nextTileState,
    };

    if (parsed.data.customHabitText !== undefined) {
      updatePayload.custom_habit_text = parsed.data.customHabitText;
    }

    const { error: updateError } = await adminClient
      .from('wellness_bingo_boards')
      .update(updatePayload)
      .eq('id', board.id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update wellness bingo board' }, { status: 500 });
    }

    const data = await buildWellnessBingoSnapshot(adminClient, user.id, role);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/wellness-bingo/board:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
