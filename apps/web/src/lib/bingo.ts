export const BINGO_TILE_IDS = [
  'move_ritual',
  'sleep_window',
  'post_411',
  'custom_habit',
  'morning_sunlight',
  'desk_stretches',
  'free_space',
  'celebrate_a_win',
  'drink_water',
  'share_learning',
  'share_goal',
  'healthy_meal_prep',
  'weekly_partner_call',
  'schedule_recharge_plan',
  'partner_encouragement',
  'screen_free',
] as const;

export type BingoTileId = (typeof BINGO_TILE_IDS)[number];

export interface BingoTileDefinition {
  id: BingoTileId;
  pointValue: number;
  title: string;
  subtitle?: string;
}

export interface BingoScoreSummary {
  completedSquares: number;
  horizontalBingos: number;
  verticalBingos: number;
  horizontalBonus: number;
  verticalBonus: number;
  bonusPoints: number;
  totalPoints: number;
}

export type BingoTileState = Record<BingoTileId, boolean>;

export const CUSTOM_HABIT_TILE_ID: BingoTileId = 'custom_habit';
export const FREE_SPACE_TILE_ID: BingoTileId = 'free_space';
export const HORIZONTAL_BINGO_BONUS = 5;
export const VERTICAL_BINGO_BONUS = 10;

export const BINGO_TILE_DEFINITIONS: ReadonlyArray<BingoTileDefinition> = [
  { id: 'move_ritual', pointValue: 1, title: '5-MIN MOVE', subtitle: 'RITUAL' },
  { id: 'sleep_window', pointValue: 1, title: '7-9 HRS', subtitle: 'SLEEP' },
  { id: 'post_411', pointValue: 1, title: 'POST YOUR', subtitle: '411' },
  { id: 'custom_habit', pointValue: 1, title: 'CUSTOM HABIT', subtitle: 'YOUR PERSONAL GOAL' },
  { id: 'morning_sunlight', pointValue: 1, title: 'MORNING', subtitle: 'SUNLIGHT' },
  { id: 'desk_stretches', pointValue: 1, title: 'DESK', subtitle: 'STRETCHES' },
  { id: 'free_space', pointValue: 1, title: 'FREE', subtitle: 'FREE SPACE - CHOOSE A HABIT' },
  { id: 'celebrate_a_win', pointValue: 1, title: 'CELEBRATE', subtitle: 'A WIN' },
  { id: 'drink_water', pointValue: 1, title: 'DRINK 8', subtitle: 'GLASSES' },
  { id: 'share_learning', pointValue: 1, title: 'SHARE A', subtitle: 'LEARNING' },
  { id: 'share_goal', pointValue: 1, title: 'SHARE', subtitle: 'A GOAL' },
  { id: 'healthy_meal_prep', pointValue: 1, title: 'HEALTHY', subtitle: 'MEAL PREP' },
  { id: 'weekly_partner_call', pointValue: 1, title: 'WEEKLY', subtitle: 'PARTNER CALL' },
  {
    id: 'schedule_recharge_plan',
    pointValue: 1,
    title: 'SCHEDULE',
    subtitle: 'RECHARGE WINDOW',
  },
  { id: 'partner_encouragement', pointValue: 1, title: 'PARTNER', subtitle: 'ENCOURAGEMENT' },
  {
    id: 'screen_free',
    pointValue: 1,
    title: 'SCREEN FREE',
    subtitle: '15-MINUTE SCREEN-FREE BEFORE BED',
  },
] as const;

export const BINGO_GRID: ReadonlyArray<ReadonlyArray<BingoTileId>> = [
  ['move_ritual', 'sleep_window', 'post_411', 'custom_habit'],
  ['morning_sunlight', 'desk_stretches', 'free_space', 'celebrate_a_win'],
  ['drink_water', 'share_learning', 'share_goal', 'healthy_meal_prep'],
  ['weekly_partner_call', 'schedule_recharge_plan', 'partner_encouragement', 'screen_free'],
] as const;

export const EMPTY_BINGO_TILE_STATE: BingoTileState = Object.fromEntries(
  BINGO_TILE_IDS.map((tileId) => [tileId, false] as const)
) as BingoTileState;

export function buildBingoScoreSummary(
  completedSquares: number,
  horizontalBingos: number,
  verticalBingos: number
): BingoScoreSummary {
  const horizontalBonus = horizontalBingos * HORIZONTAL_BINGO_BONUS;
  const verticalBonus = verticalBingos * VERTICAL_BINGO_BONUS;
  const bonusPoints = horizontalBonus + verticalBonus;

  return {
    completedSquares,
    horizontalBingos,
    verticalBingos,
    horizontalBonus,
    verticalBonus,
    bonusPoints,
    totalPoints: completedSquares + bonusPoints,
  };
}

export function normalizeBingoTileState(value: unknown): BingoTileState {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

  return BINGO_TILE_IDS.reduce(
    (accumulator, tileId) => {
      accumulator[tileId] = raw[tileId] === true;
      return accumulator;
    },
    { ...EMPTY_BINGO_TILE_STATE }
  );
}

export function computeBingoScore(tileState: BingoTileState): BingoScoreSummary {
  const completedSquares = BINGO_TILE_IDS.reduce(
    (total, tileId) => total + (tileState[tileId] ? 1 : 0),
    0
  );

  const horizontalBingos = BINGO_GRID.filter((row) =>
    row.every((tileId) => tileState[tileId])
  ).length;
  const columnCount = BINGO_GRID[0]?.length ?? 0;
  let verticalBingos = 0;

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const columnComplete = BINGO_GRID.every((row) => {
      const tileId = row[columnIndex];
      return tileId ? tileState[tileId] : false;
    });

    if (columnComplete) {
      verticalBingos += 1;
    }
  }

  return buildBingoScoreSummary(completedSquares, horizontalBingos, verticalBingos);
}

export function getBingoTileDefinition(tileId: BingoTileId): BingoTileDefinition {
  const definition = BINGO_TILE_DEFINITIONS.find((tile) => tile.id === tileId);

  if (!definition) {
    throw new Error(`Unknown bingo tile id: ${tileId}`);
  }

  return definition;
}
