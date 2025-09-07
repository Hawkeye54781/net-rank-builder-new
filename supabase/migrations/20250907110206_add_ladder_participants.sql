-- Create ladder_participants table for users to join/leave ladders
CREATE TABLE public.ladder_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ladder_id UUID NOT NULL REFERENCES public.ladders(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure a player can only be in a ladder once
    UNIQUE(ladder_id, player_id)
);

-- Enable RLS on ladder_participants
ALTER TABLE public.ladder_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ladder_participants
-- Users can view all participants (for showing ladder rosters)
CREATE POLICY "Ladder participants are viewable by everyone" 
ON public.ladder_participants FOR SELECT 
USING (true);

-- Users can insert themselves into ladders
CREATE POLICY "Users can join ladders themselves" 
ON public.ladder_participants FOR INSERT 
WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM public.profiles WHERE id = player_id
    )
);

-- Users can update their own participation (mainly for leaving ladders)
CREATE POLICY "Users can update their own ladder participation" 
ON public.ladder_participants FOR UPDATE 
USING (
    auth.uid() IN (
        SELECT user_id FROM public.profiles WHERE id = player_id
    )
);

-- Users can delete their own participation
CREATE POLICY "Users can remove themselves from ladders" 
ON public.ladder_participants FOR DELETE 
USING (
    auth.uid() IN (
        SELECT user_id FROM public.profiles WHERE id = player_id
    )
);

-- Club admins can manage all participation in their club's ladders
CREATE POLICY "Club admins can manage ladder participation" 
ON public.ladder_participants FOR ALL 
USING (
    auth.uid() IN (
        SELECT user_id FROM public.profiles p
        JOIN public.ladders l ON l.id = ladder_id
        WHERE public.is_club_admin(auth.uid(), l.club_id)
    )
);

-- Create trigger for automatic timestamp updates on ladder_participants
CREATE TRIGGER update_ladder_participants_updated_at
BEFORE UPDATE ON public.ladder_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_ladder_participants_ladder_id ON public.ladder_participants(ladder_id);
CREATE INDEX idx_ladder_participants_player_id ON public.ladder_participants(player_id);
CREATE INDEX idx_ladder_participants_active ON public.ladder_participants(ladder_id, is_active);
