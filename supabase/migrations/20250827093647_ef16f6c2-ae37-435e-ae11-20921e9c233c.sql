-- Fix security warnings by updating function search paths
CREATE OR REPLACE FUNCTION public.is_club_admin(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND club_id = _club_id
      AND role = 'club_admin'
  )
$$;

CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update member count when profiles are added/removed
    UPDATE public.club_subscriptions
    SET 
        current_member_count = (
            SELECT COUNT(*) 
            FROM public.profiles 
            WHERE club_id = COALESCE(NEW.club_id, OLD.club_id)
        ),
        monthly_amount = (
            SELECT current_member_count * sp.price_per_member_monthly
            FROM public.subscription_plans sp
            WHERE sp.id = plan_id
        ),
        updated_at = now()
    WHERE club_id = COALESCE(NEW.club_id, OLD.club_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;