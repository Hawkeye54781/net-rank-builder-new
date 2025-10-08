-- Fix RLS policy to allow updating profiles when recording matches
-- This migration adds a policy that allows users to update profiles in their club
-- when they are recording a match (both players must be in the same club)

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies for profile updates
-- Policy 1: Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can update profiles in their club for match recording
-- This allows updating match statistics (elo_rating, matches_played, matches_won)
-- for any player in the same club
CREATE POLICY "Users can update club members profiles for matches" 
ON public.profiles FOR UPDATE 
USING (
  club_id IN (
    SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  club_id IN (
    SELECT club_id FROM public.profiles WHERE user_id = auth.uid()
  )
);
