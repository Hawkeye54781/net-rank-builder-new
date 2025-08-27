-- Update subscription pricing model to per 100 members
-- Rename column to be more descriptive
ALTER TABLE public.subscription_plans 
RENAME COLUMN price_per_member_monthly TO price_per_100_members_monthly;

-- Update pricing: multiply current prices by 100 (from per member to per 100 members)
UPDATE public.subscription_plans 
SET price_per_100_members_monthly = price_per_100_members_monthly * 100;

-- Update the member count calculation function to use per-100-member pricing
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
            SELECT CEIL(current_member_count::decimal / 100) * sp.price_per_100_members_monthly
            FROM public.subscription_plans sp
            WHERE sp.id = plan_id
        ),
        updated_at = now()
    WHERE club_id = COALESCE(NEW.club_id, OLD.club_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;