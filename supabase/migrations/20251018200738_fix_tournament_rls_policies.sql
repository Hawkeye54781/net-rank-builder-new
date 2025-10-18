-- Fix Tournament RLS Policies
-- The original INSERT policy was too strict, causing violations

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Club admins can create tournaments" ON public.tournaments;

-- Create a simpler, more reliable INSERT policy
CREATE POLICY "Club admins can create tournaments"
    ON public.tournaments FOR INSERT
    WITH CHECK (
        public.is_club_admin(club_id, auth.uid())
    );

-- Also update the UPDATE policy for consistency
DROP POLICY IF EXISTS "Club admins can update tournaments" ON public.tournaments;

CREATE POLICY "Club admins can update tournaments"
    ON public.tournaments FOR UPDATE
    USING (
        public.is_club_admin(club_id, auth.uid())
    );

-- And the DELETE policy
DROP POLICY IF EXISTS "Club admins can delete tournaments" ON public.tournaments;

CREATE POLICY "Club admins can delete tournaments"
    ON public.tournaments FOR DELETE
    USING (
        public.is_club_admin(club_id, auth.uid())
    );

-- Update tournament_groups policies for consistency
DROP POLICY IF EXISTS "Club admins can manage tournament groups" ON public.tournament_groups;

CREATE POLICY "Club admins can manage tournament groups"
    ON public.tournament_groups FOR ALL
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments
            WHERE public.is_club_admin(club_id, auth.uid())
        )
    )
    WITH CHECK (
        tournament_id IN (
            SELECT id FROM public.tournaments
            WHERE public.is_club_admin(club_id, auth.uid())
        )
    );

-- Update tournament_participants policies for consistency
DROP POLICY IF EXISTS "Club admins can manage tournament participants" ON public.tournament_participants;

CREATE POLICY "Club admins can manage tournament participants"
    ON public.tournament_participants FOR ALL
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments
            WHERE public.is_club_admin(club_id, auth.uid())
        )
    )
    WITH CHECK (
        tournament_id IN (
            SELECT id FROM public.tournaments
            WHERE public.is_club_admin(club_id, auth.uid())
        )
    );

-- Update tournament_matches policies
DROP POLICY IF EXISTS "Club admins can update tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Club admins can delete tournament matches" ON public.tournament_matches;

CREATE POLICY "Club admins can update tournament matches"
    ON public.tournament_matches FOR UPDATE
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments
            WHERE public.is_club_admin(club_id, auth.uid())
        )
    );

CREATE POLICY "Club admins can delete tournament matches"
    ON public.tournament_matches FOR DELETE
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments
            WHERE public.is_club_admin(club_id, auth.uid())
        )
    );

-- Update tournament_winners policies
DROP POLICY IF EXISTS "Club admins can manage tournament winners" ON public.tournament_winners;

CREATE POLICY "Club admins can manage tournament winners"
    ON public.tournament_winners FOR ALL
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments
            WHERE public.is_club_admin(club_id, auth.uid())
        )
    )
    WITH CHECK (
        tournament_id IN (
            SELECT id FROM public.tournaments
            WHERE public.is_club_admin(club_id, auth.uid())
        )
    );

COMMENT ON POLICY "Club admins can create tournaments" ON public.tournaments IS 'Simplified policy using is_club_admin function directly';
