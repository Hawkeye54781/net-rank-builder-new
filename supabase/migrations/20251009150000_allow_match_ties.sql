-- Allow ties in matches by making winner_id nullable
-- This is useful for amateur tennis where time limits can result in tied matches

-- Drop the existing constraint that requires a winner
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS valid_winner;

-- Make winner_id nullable to allow ties
ALTER TABLE public.matches ALTER COLUMN winner_id DROP NOT NULL;

-- Add a new constraint that allows null (tie) or valid winner
ALTER TABLE public.matches ADD CONSTRAINT valid_winner_or_tie 
  CHECK (winner_id IS NULL OR winner_id = player1_id OR winner_id = player2_id);

-- Add a comment to document the tie behavior
COMMENT ON COLUMN public.matches.winner_id IS 'Winner of the match. NULL indicates a tie (both players earned 0.5 match score for ELO calculation)';
