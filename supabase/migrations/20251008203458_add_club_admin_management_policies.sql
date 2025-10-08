-- Add policies to allow club admins to manage user roles in their club

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Club admins can manage roles in their club" ON public.user_roles;

-- Allow club admins to view all roles in their club
CREATE POLICY "Club admins can view roles in their club" ON public.user_roles
FOR SELECT
USING (public.is_club_admin(auth.uid(), club_id));

-- Allow club admins to insert new admin roles in their club
CREATE POLICY "Club admins can add admins in their club" ON public.user_roles
FOR INSERT
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id) AND
  role = 'club_admin'
);

-- Allow club admins to delete admin roles in their club
CREATE POLICY "Club admins can remove admins in their club" ON public.user_roles
FOR DELETE
USING (
  public.is_club_admin(auth.uid(), club_id) AND
  role = 'club_admin'
);
