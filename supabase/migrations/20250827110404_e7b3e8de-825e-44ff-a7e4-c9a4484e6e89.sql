-- Make the logged-in user an admin for Carrickmacross Tennis Club
INSERT INTO public.user_roles (user_id, club_id, role)
VALUES ('6e522e04-1def-4a57-ae87-a26e91299bbb', '52fbcf8d-18da-45a6-9c95-4c890c3e9dda', 'club_admin')
ON CONFLICT (user_id, club_id, role) DO NOTHING;