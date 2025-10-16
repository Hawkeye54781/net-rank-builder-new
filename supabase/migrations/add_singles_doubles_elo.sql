-- Add separate ELO ratings for singles and doubles
-- Migration: Add singles_elo and doubles_elo to profiles

-- Add new columns
ALTER TABLE profiles 
ADD COLUMN singles_elo INTEGER DEFAULT 1200,
ADD COLUMN doubles_elo INTEGER DEFAULT 1200,
ADD COLUMN singles_matches_played INTEGER DEFAULT 0,
ADD COLUMN singles_matches_won INTEGER DEFAULT 0,
ADD COLUMN doubles_matches_played INTEGER DEFAULT 0,
ADD COLUMN doubles_matches_won INTEGER DEFAULT 0;

-- Migrate existing data: copy current elo_rating to singles_elo (assuming current system is singles-focused)
UPDATE profiles SET singles_elo = elo_rating;
UPDATE profiles SET singles_matches_played = matches_played;
UPDATE profiles SET singles_matches_won = matches_won;

-- Add NOT NULL constraints after data migration
ALTER TABLE profiles 
ALTER COLUMN singles_elo SET NOT NULL,
ALTER COLUMN doubles_elo SET NOT NULL,
ALTER COLUMN singles_matches_played SET NOT NULL,
ALTER COLUMN singles_matches_won SET NOT NULL,
ALTER COLUMN doubles_matches_played SET NOT NULL,
ALTER COLUMN doubles_matches_won SET NOT NULL;

-- Add check constraints
ALTER TABLE profiles
ADD CONSTRAINT singles_elo_min CHECK (singles_elo >= 0),
ADD CONSTRAINT doubles_elo_min CHECK (doubles_elo >= 0),
ADD CONSTRAINT singles_matches_played_min CHECK (singles_matches_played >= 0),
ADD CONSTRAINT singles_matches_won_range CHECK (singles_matches_won >= 0 AND singles_matches_won <= singles_matches_played),
ADD CONSTRAINT doubles_matches_played_min CHECK (doubles_matches_played >= 0),
ADD CONSTRAINT doubles_matches_won_range CHECK (doubles_matches_won >= 0 AND doubles_matches_won <= doubles_matches_played);

-- Note: Keep old columns for now for backwards compatibility
-- Can drop them in a future migration after updating all code:
-- ALTER TABLE profiles DROP COLUMN elo_rating;
-- ALTER TABLE profiles DROP COLUMN matches_played;
-- ALTER TABLE profiles DROP COLUMN matches_won;
