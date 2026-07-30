import { bingoWeeklyRecordingUpdateSchema } from '@/lib/schemas/bingo.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  buildWellnessBingoSnapshot,
  findUserPartnership,
  getActiveWeekSummary,
  getAuthedSupabase,
  getBingoAdminClient,
  resolveActiveCycle,
} from '../_lib';

export async function PUT(request: NextRequest) {
  try {
    const { user, role, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = bingoWeeklyRecordingUpdateSchema.safeParse(await request.json());

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

    const partnership = await findUserPartnership(adminClient, cycle.id, user.id);

    if (!partnership) {
      return NextResponse.json(
        { error: 'You need an active partner before saving a weekly recording link' },
        { status: 400 }
      );
    }

    const activeWeek = getActiveWeekSummary(cycle);
    const recordingUrl = parsed.data.recordingUrl?.trim() ?? null;

    if (!recordingUrl) {
      const { error: deleteError } = await adminClient
        .from('wellness_bingo_weekly_recordings')
        .delete()
        .eq('partnership_id', partnership.id)
        .eq('week_index', activeWeek.index)
        .is('deleted_at', null);

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to clear the weekly recording link' },
          { status: 500 }
        );
      }
    } else {
      const { error: upsertError } = await adminClient
        .from('wellness_bingo_weekly_recordings')
        .upsert(
          {
            cycle_id: cycle.id,
            partnership_id: partnership.id,
            week_index: activeWeek.index,
            week_start_date: activeWeek.startDate,
            week_end_date: activeWeek.endDate,
            recording_url: recordingUrl,
            updated_by: user.id,
            created_by: user.id,
            deleted_at: null,
          },
          { onConflict: 'partnership_id,week_index' }
        );

      if (upsertError) {
        return NextResponse.json(
          { error: 'Failed to save the weekly recording link' },
          { status: 500 }
        );
      }
    }

    const data = await buildWellnessBingoSnapshot(adminClient, user.id, role);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PUT /api/wellness-bingo/recording:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
