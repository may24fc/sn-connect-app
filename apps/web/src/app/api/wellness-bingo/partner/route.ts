import { createNotification, getUserDisplayName } from '@/lib/notifications/create-notification';
import { bingoPartnerUpdateSchema } from '@/lib/schemas/bingo.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  type BingoCycleSummary,
  buildWellnessBingoSnapshot,
  ensureBoard,
  findUserPartnership,
  getAuthedSupabase,
  getBingoAdminClient,
  normalizePartnershipUsers,
  resolveActiveCycle,
} from '../_lib';

type AdminClient = ReturnType<typeof getBingoAdminClient>;
type ExistingPartnership = Awaited<ReturnType<typeof findUserPartnership>>;

export async function PUT(request: NextRequest) {
  try {
    const { user, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await parsePartnerRequest(request);
    if (parsed.response) {
      return parsed.response;
    }

    const adminClient = getBingoAdminClient();
    const cycle = await resolveActiveCycle(adminClient);

    if (!cycle) {
      return NextResponse.json(
        { error: 'No active wellness bingo cycle is configured' },
        { status: 404 }
      );
    }

    const existingPartnership = await findUserPartnership(adminClient, cycle.id, user.id);
    const { partnerUserId } = parsed.data;
    const existingPartnerUserId = getPartnerIdForUser(existingPartnership, user.id);

    if (!partnerUserId) {
      const clearResult = await clearExistingPartnership(adminClient, existingPartnership);
      if (clearResult) {
        return clearResult;
      }

      const data = await buildWellnessBingoSnapshot(adminClient, user.id);
      return NextResponse.json({ data });
    }

    const partnerValidation = await validatePartnerSelection({
      adminClient,
      cycle,
      currentUserId: user.id,
      partnerUserId,
      existingPartnerUserId,
    });

    if (partnerValidation.response) {
      return partnerValidation.response;
    }

    if (partnerValidation.isUnchangedPartner) {
      const data = await buildWellnessBingoSnapshot(adminClient, user.id);
      return NextResponse.json({ data });
    }

    const clearResult = await clearExistingPartnership(
      adminClient,
      existingPartnership,
      'Failed to update wellness partner'
    );
    if (clearResult) {
      return clearResult;
    }

    const saveResult = await savePartnership(adminClient, cycle.id, user.id, partnerUserId);
    if (saveResult) {
      return saveResult;
    }

    await ensureBoard(adminClient, cycle, user.id, user.id);
    await ensureBoard(adminClient, cycle, partnerUserId, user.id);

    void notifySelectedPartner({
      actorUserId: user.id,
      partnerUserId,
      cycleTitle: cycle.title,
      cycleId: cycle.id,
    });

    const data = await buildWellnessBingoSnapshot(adminClient, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PUT /api/wellness-bingo/partner:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

async function parsePartnerRequest(
  request: NextRequest
): Promise<
  | { response: NextResponse; data: null }
  | { response: null; data: ReturnType<typeof bingoPartnerUpdateSchema.parse> }
> {
  const parsed = bingoPartnerUpdateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return {
      response: NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      ),
      data: null,
    };
  }

  return { response: null, data: parsed.data };
}

function getPartnerIdForUser(
  existingPartnership: ExistingPartnership,
  userId: string
): string | null {
  if (!existingPartnership) {
    return null;
  }

  return existingPartnership.user_a_id === userId
    ? existingPartnership.user_b_id
    : existingPartnership.user_a_id;
}

async function validatePartnerSelection({
  adminClient,
  cycle,
  currentUserId,
  partnerUserId,
  existingPartnerUserId,
}: {
  adminClient: AdminClient;
  cycle: BingoCycleSummary;
  currentUserId: string;
  partnerUserId: string;
  existingPartnerUserId: string | null;
}): Promise<{ response: NextResponse | null; isUnchangedPartner: boolean }> {
  if (partnerUserId === currentUserId) {
    return {
      response: NextResponse.json({ error: 'You cannot partner with yourself' }, { status: 400 }),
      isUnchangedPartner: false,
    };
  }

  const { data: partnerUser, error: partnerUserError } = await adminClient
    .from('users')
    .select('id, role, status')
    .eq('id', partnerUserId)
    .is('deleted_at', null)
    .neq('status', 'terminated')
    .maybeSingle();

  if (partnerUserError || !partnerUser) {
    return {
      response: NextResponse.json({ error: 'Partner not found' }, { status: 404 }),
      isUnchangedPartner: false,
    };
  }

  const partnerPartnership = await findUserPartnership(adminClient, cycle.id, partnerUserId);
  if (
    partnerPartnership &&
    !isPartnershipBetweenUsers(partnerPartnership, currentUserId, partnerUserId)
  ) {
    return {
      response: NextResponse.json(
        { error: 'That teammate is already paired in this wellness cycle' },
        { status: 409 }
      ),
      isUnchangedPartner: false,
    };
  }

  return {
    response: null,
    isUnchangedPartner: existingPartnerUserId === partnerUserId,
  };
}

async function clearExistingPartnership(
  adminClient: AdminClient,
  existingPartnership: ExistingPartnership,
  message = 'Failed to clear wellness partner'
): Promise<NextResponse | null> {
  if (!existingPartnership) {
    return null;
  }

  const { error } = await adminClient
    .from('wellness_bingo_partnerships')
    .delete()
    .eq('id', existingPartnership.id);

  if (error) {
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return null;
}

async function savePartnership(
  adminClient: AdminClient,
  cycleId: string,
  userId: string,
  partnerUserId: string
): Promise<NextResponse | null> {
  const [userAId, userBId] = normalizePartnershipUsers(userId, partnerUserId);

  const { error } = await adminClient.from('wellness_bingo_partnerships').insert({
    cycle_id: cycleId,
    user_a_id: userAId,
    user_b_id: userBId,
    created_by: userId,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'That teammate is already paired in this wellness cycle' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to save wellness partner' }, { status: 500 });
  }

  return null;
}

function isPartnershipBetweenUsers(
  partnership: NonNullable<ExistingPartnership>,
  leftUserId: string,
  rightUserId: string
) {
  return (
    (partnership.user_a_id === leftUserId && partnership.user_b_id === rightUserId) ||
    (partnership.user_a_id === rightUserId && partnership.user_b_id === leftUserId)
  );
}

async function notifySelectedPartner({
  actorUserId,
  partnerUserId,
  cycleTitle,
  cycleId,
}: {
  actorUserId: string;
  partnerUserId: string;
  cycleTitle: string;
  cycleId: string;
}): Promise<void> {
  try {
    const actorName = await getUserDisplayName(actorUserId);

    await createNotification({
      userId: partnerUserId,
      type: 'system',
      title: 'New wellness bingo partner',
      message: `${actorName} selected you as their partner for ${cycleTitle}. Open Wellness Bingo to track your shared progress.`,
      link: '/bingo',
      metadata: {
        feature: 'wellness_bingo',
        action: 'partner_selected',
        actorUserId,
        cycleId,
      },
      dedupeKey: `wellness-bingo-partner:${cycleId}:${actorUserId}:${partnerUserId}`,
    });
  } catch (error) {
    console.error('Failed to notify selected wellness bingo partner:', error);
  }
}
