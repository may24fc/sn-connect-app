import {
  BINGO_TILE_IDS,
  CUSTOM_HABIT_TILE_ID,
  type BingoTileId,
} from '@/lib/bingo';
import { z } from 'zod';

export const bingoTileIdSchema = z.enum(BINGO_TILE_IDS);

export const bingoBoardUpdateSchema = z
  .object({
    tileId: bingoTileIdSchema.optional(),
    checked: z.boolean().optional(),
    customHabitText: z.string().trim().min(1).max(80).nullable().optional(),
  })
  .refine((value) => (value.tileId === undefined) === (value.checked === undefined), {
    message: 'tileId and checked must be provided together',
    path: ['checked'],
  })
  .refine((value) => value.tileId !== undefined || value.customHabitText !== undefined, {
    message: 'Provide a tile toggle or a custom habit update',
  });

export const bingoPartnerUpdateSchema = z.object({
  partnerUserId: z.string().uuid().nullable(),
});

export const bingoPartnersQuerySchema = z.object({
  cycleId: z.string().uuid().optional(),
});

export function isCustomHabitTile(tileId: BingoTileId): boolean {
  return tileId === CUSTOM_HABIT_TILE_ID;
}

export type BingoTileIdInput = z.infer<typeof bingoTileIdSchema>;
export type BingoBoardUpdateInput = z.infer<typeof bingoBoardUpdateSchema>;
export type BingoPartnerUpdateInput = z.infer<typeof bingoPartnerUpdateSchema>;