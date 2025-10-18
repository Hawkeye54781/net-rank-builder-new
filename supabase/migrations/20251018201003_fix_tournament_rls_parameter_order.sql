-- Fix Tournament RLS Policies - Correct Parameter Order
-- The is_club_admin function expects (user_id, club_id) not (club_id, user_id)

-- Drop and recreate all tournament policies with correct parameter order

-- TOURNAMENTS TABLE
DROP POLICY IF EXISTS "Club admins can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Club admins can update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Club admins can delete tournaments" ON public.tournaments;

CREATE POLICY "Club admins can create tournaments"
    ON public.tournaments FOR INSERT
    WITH CHECK (
        public.is_club_admin(auth.uid(), club_id)
    );

CREATE POLICY "Club admins can update tournaments"
    ON public.tournaments FOR UPDATE
    USING (
        public.is_club_admin(auth.uid(), club_id)
    );

CREATE POLICY "Club admins can delete tournaments"
    ON public.tournaments FOR DELETE
    USING (
        public.is_club_admin(auth.uid(), club_id)
    );

-- TOURNAMENT GROUPS TABLE
DROP POLICY IF EXISTS "Club admins can manage tournament groups" ON public.tournament_groups;

CREATE POLICY "Club admins can manage tournament groups"
    ON public.tournament_groups FOR ALL
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments t
            WHERE public.is_club_admin(auth.uid(), t.club_id)
        )
    )
    WITH CHECK (
        tournament_id IN (
            SELECT id FROM public.tournaments t
            WHERE public.is_club_admin(auth.uid(), t.club_id)
        )
    );

-- TOURNAMENT PARTICIPANTS TABLE
DROP POLICY IF EXISTS "Club admins can manage tournament participants" ON public.tournament_participants;

CREATE POLICY "Club admins can manage tournament participants"
    ON public.tournament_participants FOR ALL
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments t
            WHERE public.is_club_admin(auth.uid(), t.club_id)
        )
    )
    WITH CHECK (
        tournament_id IN (
            SELECT id FROM public.tournaments t
            WHERE public.is_club_admin(auth.uid(), t.club_id)
        )
    );

-- TOURNAMENT MATCHES TABLE
DROP POLICY IF EXISTS "Club admins can update tournament matches" ON public.tournament_matches;
DROP POLICY IF EXISTS "Club admins can delete tournament matches" ON public.tournament_matches;

CREATE POLICY "Club admins can update tournament matches"
    ON public.tournament_matches FOR UPDATE
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments t
            WHERE public.is_club_admin(auth.uid(), t.club_id)
        )
    );

CREATE POLICY "Club admins can delete tournament matches"
    ON public.tournament_matches FOR DELETE
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments t
            WHERE public.is_club_admin(auth.uid(), t.club_id)
        )
    );

-- TOURNAMENT WINNERS TABLE
DROP POLICY IF EXISTS "Club admins can manage tournament winners" ON public.tournament_winners;

CREATE POLICY "Club admins can manage tournament winners"
    ON public.tournament_winners FOR ALL
    USING (
        tournament_id IN (
            SELECT id FROM public.tournaments t
            WHERE public.is_club_admin(auth.uid(), t.club_id)
        )
    )
    WITH CHECK (
        tournament_id IN (
            SELECT id FROM public.tournaments t
            WHERE public.is_club_admin(auth.uid(), t.club_id)
        )
    );

COMMENT ON POLICY "Club admins can create tournaments" ON public.tournaments IS 'Fixed: is_club_admin expects (user_id, club_id)';
