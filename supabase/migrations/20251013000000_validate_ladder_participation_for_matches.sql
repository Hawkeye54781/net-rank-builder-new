-- Add validation to ensure players are ladder participants before recording matches
-- This prevents users from recording matches on ladders they haven't joined

-- Create a function to check if both players are active participants in the ladder
CREATE OR REPLACE FUNCTION public.validate_match_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if player1 is an active participant in the ladder
    IF NOT EXISTS (
        SELECT 1 FROM public.ladder_participants
        WHERE ladder_id = NEW.ladder_id
        AND player_id = NEW.player1_id
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Player 1 is not an active participant in this ladder';
    END IF;

    -- Check if player2 is an active participant in the ladder
    IF NOT EXISTS (
        SELECT 1 FROM public.ladder_participants
        WHERE ladder_id = NEW.ladder_id
        AND player_id = NEW.player2_id
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Player 2 is not an active participant in this ladder';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate participants before inserting a match
CREATE TRIGGER validate_match_participants_trigger
BEFORE INSERT ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.validate_match_participants();

-- Update the RLS policy for matches to also check ladder participation
DROP POLICY IF EXISTS "Users can create matches they participate in" ON public.matches;

CREATE POLICY "Users can create matches they participate in" 
ON public.matches FOR INSERT 
WITH CHECK (
    -- User must be one of the players
    auth.uid() IN (
        SELECT user_id FROM public.profiles WHERE id = player1_id OR id = player2_id
    )
    AND
    -- Both players must be active participants in the ladder
    EXISTS (
        SELECT 1 FROM public.ladder_participants
        WHERE ladder_id = matches.ladder_id
        AND player_id = player1_id
        AND is_active = true
    )
    AND
    EXISTS (
        SELECT 1 FROM public.ladder_participants
        WHERE ladder_id = matches.ladder_id
        AND player_id = player2_id
        AND is_active = true
    )
);
