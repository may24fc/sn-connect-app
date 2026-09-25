import { z } from 'zod';

export const CHRISTMAS_ORNAMENT_ASSETS = [
  'red',
  'gold',
  'silver',
  'green',
  'blue',
  'pearl',
  'burgundy',
  'champagne',
] as const;

export const CHRISTMAS_WISH_CATEGORIES = ['personal', 'for_others', 'for_sn'] as const;

const christmasOrnamentPositionSchema = z.object({
  positionX: z.number().finite().min(6).max(94),
  positionY: z.number().finite().min(10).max(80),
});

export const christmasOrnamentPlacementSchema = christmasOrnamentPositionSchema.extend({
  assetType: z.enum(CHRISTMAS_ORNAMENT_ASSETS),
});

export const christmasOrnamentMoveSchema = christmasOrnamentPositionSchema;

export const christmasWishUpsertSchema = z
  .object({
    category: z.enum(CHRISTMAS_WISH_CATEGORIES),
    itemNumber: z.number().int().min(1).max(3).default(1),
    content: z.string().trim().min(1).max(500),
  })
  .superRefine(({ category, itemNumber }, context) => {
    if (category === 'personal' && itemNumber <= 3) {
      return;
    }

    if (category !== 'personal' && itemNumber !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only personal wishes may have more than one item',
        path: ['itemNumber'],
      });
    }
  });

export const christmasWishDeleteSchema = z
  .object({
    category: z.enum(CHRISTMAS_WISH_CATEGORIES),
    itemNumber: z.number().int().min(1).max(3).default(1),
  })
  .superRefine(({ category, itemNumber }, context) => {
    if (category === 'personal' && itemNumber <= 3) {
      return;
    }

    if (category !== 'personal' && itemNumber !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only personal wishes may have more than one item',
        path: ['itemNumber'],
      });
    }
  });

export type ChristmasOrnamentPlacementInput = z.infer<typeof christmasOrnamentPlacementSchema>;
export type ChristmasOrnamentMoveInput = z.infer<typeof christmasOrnamentMoveSchema>;
export type ChristmasWishUpsertInput = z.infer<typeof christmasWishUpsertSchema>;
export type ChristmasWishDeleteInput = z.infer<typeof christmasWishDeleteSchema>;
