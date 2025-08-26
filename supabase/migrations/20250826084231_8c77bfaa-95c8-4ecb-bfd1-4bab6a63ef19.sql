-- Create some sample ladders for the existing clubs
INSERT INTO public.ladders (club_id, name, type) 
SELECT id, 'Men''s Singles', 'singles' FROM public.clubs;

INSERT INTO public.ladders (club_id, name, type) 
SELECT id, 'Women''s Singles', 'singles' FROM public.clubs;

INSERT INTO public.ladders (club_id, name, type) 
SELECT id, 'Mixed Doubles', 'doubles' FROM public.clubs;