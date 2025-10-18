-- Tournament System Migration
-- Adds support for competitive tennis tournaments with round-robin format
-- Includes support for multiple groups, guest players, and ELO-based rewards

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Tournament format enum (round_robin initially, expandable for future formats)
CREATE TYPE public.tournament_format AS ENUM ('round_robin');

-- Tournament status enum
CREATE TYPE public.tournament_status AS ENUM ('draft', 'active', 'completed');

-- Gender enum for tournament groups
CREATE TYPE public.tournament_gender AS ENUM ('mens', 'womens', 'mixed');

-- Match type enum for tournament groups
CREATE TYPE public.tournament_match_type AS ENUM ('singles', 'doubles');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Tournaments table - main tournament configuration
CREATE TABLE public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format public.tournament_format NOT NULL DEFAULT 'round_robin',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status public.tournament_status NOT NULL DEFAULT 'draft',
    winner_bonus_elo INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Validation constraints
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT valid_bonus_elo CHECK (winner_bonus_elo >= 0)
);

-- Tournament groups - subdivisions within tournaments (e.g., by level, gender, match type)
CREATE TABLE public.tournament_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level TEXT, -- e.g., "Beginner", "Intermediate", "Advanced"
    gender public.tournament_gender NOT NULL DEFAULT 'mixed',
    match_type public.tournament_match_type NOT NULL DEFAULT 'singles',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure unique group names within a tournament
    UNIQUE(tournament_id, name)
);

-- Tournament participants - players participating in tournament groups
CREATE TABLE public.tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_guest BOOLEAN NOT NULL DEFAULT false,
    guest_name TEXT, -- Used for guest players (when is_guest = true)
    guest_deleted_at TIMESTAMPTZ, -- Timestamp when guest was marked for cleanup
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure a player can only be in a group once
    UNIQUE(group_id, player_id),
    
    -- Ensure guest_name is provided for guests
    CONSTRAINT valid_guest_name CHECK (
        (is_guest = false) OR 
        (is_guest = true AND guest_name IS NOT NULL)
    )
);

-- Tournament matches - matches played within tournament groups
CREATE TABLE public.tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
    player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    player2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    player1_score INTEGER NOT NULL,
    player2_score INTEGER NOT NULL,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    affects_elo BOOLEAN NOT NULL DEFAULT true, -- false when guest is involved
    player1_elo_before INTEGER NOT NULL,
    player2_elo_before INTEGER NOT NULL,
    player1_elo_after INTEGER NOT NULL,
    player2_elo_after INTEGER NOT NULL,
    match_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Validation constraints
    CONSTRAINT valid_winner_or_tie CHECK (
        winner_id IS NULL OR 
        winner_id = player1_id OR 
        winner_id = player2_id
    ),
    CONSTRAINT different_players CHECK (player1_id != player2_id),
    CONSTRAINT valid_scores CHECK (player1_score >= 0 AND player2_score >= 0)
);

-- Tournament winners - records group winners and bonus ELO awarded
CREATE TABLE public.tournament_winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    final_standing INTEGER NOT NULL, -- 1 = winner, 2 = runner-up, etc.
    bonus_elo_awarded INTEGER NOT NULL,
    match_wins INTEGER NOT NULL DEFAULT 0,
    match_losses INTEGER NOT NULL DEFAULT 0,
    sets_won INTEGER NOT NULL DEFAULT 0,
    sets_lost INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure unique standings per group
    UNIQUE(group_id, final_standing),
    UNIQUE(group_id, player_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tournaments indexes
CREATE INDEX idx_tournaments_club_id ON public.tournaments(club_id);
CREATE INDEX idx_tournaments_status ON public.tournaments(status);
CREATE INDEX idx_tournaments_club_status ON public.tournaments(club_id, status);
CREATE INDEX idx_tournaments_dates ON public.tournaments(start_date, end_date);

-- Tournament groups indexes
CREATE INDEX idx_tournament_groups_tournament_id ON public.tournament_groups(tournament_id);

-- Tournament participants indexes
CREATE INDEX idx_tournament_participants_tournament_id ON public.tournament_participants(tournament_id);
CREATE INDEX idx_tournament_participants_group_id ON public.tournament_participants(group_id);
CREATE INDEX idx_tournament_participants_player_id ON public.tournament_participants(player_id);
CREATE INDEX idx_tournament_participants_guest_cleanup ON public.tournament_participants(is_guest, guest_deleted_at) 
    WHERE is_guest = true AND guest_deleted_at IS NULL;

-- Tournament matches indexes
CREATE INDEX idx_tournament_matches_tournament_id ON public.tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_group_id ON public.tournament_matches(group_id);
CREATE INDEX idx_tournament_matches_player1_id ON public.tournament_matches(player1_id);
CREATE INDEX idx_tournament_matches_player2_id ON public.tournament_matches(player2_id);
CREATE INDEX idx_tournament_matches_date ON public.tournament_matches(match_date);

-- Tournament winners indexes
CREATE INDEX idx_tournament_winners_tournament_id ON public.tournament_winners(tournament_id);
CREATE INDEX idx_tournament_winners_group_id ON public.tournament_winners(group_id);
CREATE INDEX idx_tournament_winners_player_id ON public.tournament_winners(player_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE TRIGGER update_tournaments_updated_at
    BEFORE UPDATE ON public.tournaments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournament_groups_updated_at
    BEFORE UPDATE ON public.tournament_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournament_matches_updated_at
    BEFORE UPDATE ON public.tournament_matches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tournament tables
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_winners ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - TOURNAMENTS
-- ============================================================================

-- Everyone can view tournaments in their club
CREATE POLICY "Club members can view tournaments"
    ON public.tournaments FOR SELECT
    USING (
        club_id IN (
            SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
        )
    );

-- Only club admins can create tournaments
CREATE POLICY "Club admins can create tournaments"
    ON public.tournaments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
            AND p.club_id = club_id
            AND public.is_club_admin(club_id, auth.uid())
        )
    );

-- Only club admins can update tournaments
CREATE POLICY "Club admins can update tournaments"
    ON public.tournaments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
            AND p.club_id = club_id
            AND public.is_club_admin(club_id, auth.uid())
        )
    );

-- Only club admins can delete tournaments
CREATE POLICY "Club admins can delete tournaments"
    ON public.tournaments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
            AND p.club_id = club_id
            AND public.is_club_admin(club_id, auth.uid())
        )
    );

-- ============================================================================
-- RLS POLICIES - TOURNAMENT GROUPS
-- ============================================================================

-- Everyone can view tournament groups in their club
CREATE POLICY "Club members can view tournament groups"
    ON public.tournament_groups FOR SELECT
    USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.profiles p ON p.club_id = t.club_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Only club admins can manage groups
CREATE POLICY "Club admins can manage tournament groups"
    ON public.tournament_groups FOR ALL
    USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.profiles p ON p.club_id = t.club_id
            WHERE p.user_id = auth.uid()
            AND public.is_club_admin(t.club_id, auth.uid())
        )
    );

-- ============================================================================
-- RLS POLICIES - TOURNAMENT PARTICIPANTS
-- ============================================================================

-- Everyone can view tournament participants in their club
CREATE POLICY "Club members can view tournament participants"
    ON public.tournament_participants FOR SELECT
    USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.profiles p ON p.club_id = t.club_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Only club admins can manage participants
CREATE POLICY "Club admins can manage tournament participants"
    ON public.tournament_participants FOR ALL
    USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.profiles p ON p.club_id = t.club_id
            WHERE p.user_id = auth.uid()
            AND public.is_club_admin(t.club_id, auth.uid())
        )
    );

-- ============================================================================
-- RLS POLICIES - TOURNAMENT MATCHES
-- ============================================================================

-- Everyone can view tournament matches in their club
CREATE POLICY "Club members can view tournament matches"
    ON public.tournament_matches FOR SELECT
    USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.profiles p ON p.club_id = t.club_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Participating players can record their own matches
CREATE POLICY "Participants can record tournament matches"
    ON public.tournament_matches FOR INSERT
    WITH CHECK (
        -- Must be a participant in the tournament
        EXISTS (
            SELECT 1 FROM public.tournament_participants tp
            JOIN public.profiles p ON p.id = tp.player_id
            WHERE tp.tournament_id = tournament_id
            AND p.user_id = auth.uid()
            AND (tp.player_id = player1_id OR tp.player_id = player2_id)
        )
    );

-- Only club admins can update or delete matches
CREATE POLICY "Club admins can update tournament matches"
    ON public.tournament_matches FOR UPDATE
    USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.profiles p ON p.club_id = t.club_id
            WHERE p.user_id = auth.uid()
            AND public.is_club_admin(t.club_id, auth.uid())
        )
    );

CREATE POLICY "Club admins can delete tournament matches"
    ON public.tournament_matches FOR DELETE
    USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.profiles p ON p.club_id = t.club_id
            WHERE p.user_id = auth.uid()
            AND public.is_club_admin(t.club_id, auth.uid())
        )
    );

-- ============================================================================
-- RLS POLICIES - TOURNAMENT WINNERS
-- ============================================================================

-- Everyone can view tournament winners in their club
CREATE POLICY "Club members can view tournament winners"
    ON public.tournament_winners FOR SELECT
    USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.profiles p ON p.club_id = t.club_id
            WHERE p.user_id = auth.uid()
        )
    );

-- Only club admins can manage winners (typically via automated process)
CREATE POLICY "Club admins can manage tournament winners"
    ON public.tournament_winners FOR ALL
    USING (
        tournament_id IN (
            SELECT t.id FROM public.tournaments t
            JOIN public.profiles p ON p.club_id = t.club_id
            WHERE p.user_id = auth.uid()
            AND public.is_club_admin(t.club_id, auth.uid())
        )
    );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.tournaments IS 'Main tournament configuration with dates, format, and bonus ELO settings';
COMMENT ON TABLE public.tournament_groups IS 'Tournament subdivisions by level, gender, and match type';
COMMENT ON TABLE public.tournament_participants IS 'Players participating in tournament groups, including guest players';
COMMENT ON TABLE public.tournament_matches IS 'Matches played within tournament groups with ELO tracking';
COMMENT ON TABLE public.tournament_winners IS 'Final standings and bonus ELO awarded to group winners';

COMMENT ON COLUMN public.tournament_participants.is_guest IS 'True for guest players who do not have full user accounts';
COMMENT ON COLUMN public.tournament_participants.guest_deleted_at IS 'Timestamp when guest was marked for cleanup (7 days after tournament end)';
COMMENT ON COLUMN public.tournament_matches.affects_elo IS 'False when match involves a guest player (no ELO change for registered players)';
COMMENT ON COLUMN public.tournament_matches.winner_id IS 'Winner of the match. NULL indicates a tie';
