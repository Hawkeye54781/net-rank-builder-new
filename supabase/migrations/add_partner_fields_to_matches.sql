-- Add partner fields to matches table for doubles support
-- Migration: Add partner player IDs and ELO tracking

-- Add partner player IDs (nullable for singles matches)
ALTER TABLE matches 
ADD COLUMN player1_partner_id UUID REFERENCES profiles(id),
ADD COLUMN player2_partner_id UUID REFERENCES profiles(id);

-- Add partner ELO tracking (nullable for singles matches)
ALTER TABLE matches
ADD COLUMN player1_partner_elo_before INTEGER,
ADD COLUMN player1_partner_elo_after INTEGER,
ADD COLUMN player2_partner_elo_before INTEGER,
ADD COLUMN player2_partner_elo_after INTEGER;

-- Add check constraints for partner ELO values
ALTER TABLE matches
ADD CONSTRAINT player1_partner_elo_before_min CHECK (player1_partner_elo_before IS NULL OR player1_partner_elo_before >= 0),
ADD CONSTRAINT player1_partner_elo_after_min CHECK (player1_partner_elo_after IS NULL OR player1_partner_elo_after >= 0),
ADD CONSTRAINT player2_partner_elo_before_min CHECK (player2_partner_elo_before IS NULL OR player2_partner_elo_before >= 0),
ADD CONSTRAINT player2_partner_elo_after_min CHECK (player2_partner_elo_after IS NULL OR player2_partner_elo_after >= 0);

-- Add comment for clarity
COMMENT ON COLUMN matches.player1_partner_id IS 'Partner for player 1 in doubles matches (NULL for singles)';
COMMENT ON COLUMN matches.player2_partner_id IS 'Partner for player 2 in doubles matches (NULL for singles)';
