import { christmasExchangeGiftAddressSchema } from '@/lib/schemas/christmas-tree.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  ChristmasTreeRequestError,
  buildChristmasTreeSnapshot,
  getChristmasTreeAdminClient,
  getChristmasTreeAuth,
  saveChristmasExchangeGiftDeliveryAddress,
} from '../../_lib';

export async function PUT(request: NextRequest) {
  try {
    const { user, role } = await getChristmasTreeAuth();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = christmasExchangeGiftAddressSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Enter a delivery address between 5 and 500 characters' },
        { status: 400 }
      );
    }

    const adminClient = getChristmasTreeAdminClient();
    await saveChristmasExchangeGiftDeliveryAddress(
      adminClient,
      user.id,
      parsed.data.deliveryAddress
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
