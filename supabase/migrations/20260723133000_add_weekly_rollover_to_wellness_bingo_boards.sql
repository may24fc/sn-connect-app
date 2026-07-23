BEGIN;

ALTER TABLE public.wellness_bingo_boards
  ADD COLUMN current_week_index integer NOT NULL DEFAULT 1,
  ADD COLUMN cumulative_completed_squares integer NOT NULL DEFAULT 0,
  ADD COLUMN cumulative_horizontal_bingos integer NOT NULL DEFAULT 0,
  ADD COLUMN cumulative_vertical_bingos integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.wellness_bingo_boards.current_week_index IS
  'Current 7-day window index within the active 30-day cycle for the live tile_state.';

COMMENT ON COLUMN public.wellness_bingo_boards.cumulative_completed_squares IS
  'Completed-square count accumulated from closed weekly windows in the current cycle.';

COMMENT ON COLUMN public.wellness_bingo_boards.cumulative_horizontal_bingos IS
  'Horizontal bingo count accumulated from closed weekly windows in the current cycle.';

COMMENT ON COLUMN public.wellness_bingo_boards.cumulative_vertical_bingos IS
  'Vertical bingo count accumulated from closed weekly windows in the current cycle.';

COMMIT;