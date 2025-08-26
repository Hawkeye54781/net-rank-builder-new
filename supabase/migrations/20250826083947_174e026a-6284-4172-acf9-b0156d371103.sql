-- Create clubs table
CREATE TABLE public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ladders table
CREATE TABLE public.ladders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Men's Singles", "Women's Doubles"
  type TEXT NOT NULL, -- e.g., "singles", "doubles"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, name)
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  matches_played INTEGER NOT NULL DEFAULT 0,
  matches_won INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ladder_id UUID NOT NULL REFERENCES public.ladders(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player1_score INTEGER NOT NULL,
  player2_score INTEGER NOT NULL,
  winner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player1_elo_before INTEGER NOT NULL,
  player2_elo_before INTEGER NOT NULL,
  player1_elo_after INTEGER NOT NULL,
  player2_elo_after INTEGER NOT NULL,
  match_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_winner CHECK (winner_id = player1_id OR winner_id = player2_id),
  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Create yearly winners table
CREATE TABLE public.yearly_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ladder_id UUID NOT NULL REFERENCES public.ladders(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  final_elo_rating INTEGER NOT NULL,
  matches_played INTEGER NOT NULL,
  matches_won INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ladder_id, year, player_id)
);

-- Enable RLS on all tables
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ladders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearly_winners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clubs (viewable by everyone)
CREATE POLICY "Clubs are viewable by everyone" 
ON public.clubs FOR SELECT 
USING (true);

-- RLS Policies for ladders (viewable by everyone)
CREATE POLICY "Ladders are viewable by everyone" 
ON public.ladders FOR SELECT 
USING (true);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for matches
CREATE POLICY "Matches are viewable by everyone" 
ON public.matches FOR SELECT 
USING (true);

CREATE POLICY "Users can create matches they participate in" 
ON public.matches FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.profiles WHERE id = player1_id OR id = player2_id
));

-- RLS Policies for yearly winners (viewable by everyone)
CREATE POLICY "Yearly winners are viewable by everyone" 
ON public.yearly_winners FOR SELECT 
USING (true);

-- Insert some sample clubs
INSERT INTO public.clubs (name, location) VALUES
('Riverside Tennis Club', 'New York, NY'),
('Greenfield Tennis Academy', 'Los Angeles, CA'),
('Mountain View Tennis Center', 'Denver, CO'),
('Coastal Tennis Club', 'Miami, FL');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();