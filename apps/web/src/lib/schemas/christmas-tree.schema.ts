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

const christmasWishLinkSchema = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .transform((value) => value || null)
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Enter a valid http:// or https:// link' }
  );

export const christmasOrnamentPlacementSchema = christmasOrnamentPositionSchema.extend({
  assetType: z.enum(CHRISTMAS_ORNAMENT_ASSETS),
});

export const christmasOrnamentMoveSchema = christmasOrnamentPositionSchema;

export const christmasOrnamentDeleteSchema = z.object({
  ornamentId: z.string().uuid().optional(),
});

export const christmasDecorationEnableSchema = z.object({
  decoration: z.enum(['garland', 'lights', 'star']),
});

export const christmasDecorationRemoveSchema = z.union([
  z.object({ decoration: z.literal('star') }),
  z.object({ strandId: z.string().uuid() }),
]);
export type ChristmasDecorationRemoveInput = z.infer<typeof christmasDecorationRemoveSchema>;

export const christmasStrandGeometrySchema = z
  .object({
    startX: z.number().finite().min(6).max(94),
    startY: z.number().finite().min(10).max(80),
    endX: z.number().finite().min(6).max(94),
    endY: z.number().finite().min(10).max(80),
  })
  .refine((value) => value.endX - value.startX >= 12, {
    message: 'The strand must span at least 12% of the tree width',
  })
  .refine(
    (value) =>
      [
        [value.startX, value.startY],
        [value.endX, value.endY],
      ].every(([x, y]) => x !== undefined && y !== undefined && Math.abs(x - 50) <= (y - 7) * 0.57),
    { message: 'Attach both ends to the green branches' }
  );

export const christmasStrandSaveSchema = z.object({
  decoration: z.enum(['garland', 'lights']),
  strandId: z.string().uuid().optional(),
  geometry: christmasStrandGeometrySchema,
});

export const christmasWishUpsertSchema = z
  .object({
    category: z.enum(CHRISTMAS_WISH_CATEGORIES),
    itemNumber: z.number().int().min(1).max(3).default(1),
    content: z.string().trim().min(1).max(500),
    linkUrl: christmasWishLinkSchema,
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
  })
  .transform((wish) => ({
    ...wish,
    linkUrl: wish.category === 'personal' ? (wish.linkUrl ?? null) : null,
  }));

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
export type ChristmasOrnamentDeleteInput = z.infer<typeof christmasOrnamentDeleteSchema>;
export type ChristmasDecorationEnableInput = z.infer<typeof christmasDecorationEnableSchema>;
export type ChristmasStrandGeometry = z.infer<typeof christmasStrandGeometrySchema>;
export type ChristmasStrandSaveInput = z.infer<typeof christmasStrandSaveSchema>;
export type ChristmasWishUpsertInput = z.infer<typeof christmasWishUpsertSchema>;
export type ChristmasWishDeleteInput = z.infer<typeof christmasWishDeleteSchema>;
