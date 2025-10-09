-- Function to handle new user signup and create their profile
-- This trigger automatically creates a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_club_id uuid;
BEGIN
  -- Try to get club_id from user metadata, fallback to first available club
  BEGIN
    v_club_id := (NEW.raw_user_meta_data->>'club_id')::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      SELECT id INTO v_club_id FROM public.clubs ORDER BY name LIMIT 1;
  END;
  
  -- Only create profile if we have a valid club_id
  IF v_club_id IS NOT NULL THEN
    INSERT INTO public.profiles (
      user_id,
      email,
      first_name,
      last_name,
      club_id,
      phone,
      elo_rating,
      matches_played,
      matches_won
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      v_club_id,
      NEW.raw_user_meta_data->>'phone',
      1200,  -- Default ELO rating
      0,     -- Initial matches played
      0      -- Initial matches won
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
