-- Add Carrickmacross Tennis Club
INSERT INTO public.clubs (name, location) 
VALUES ('Carrickmacross Tennis Club', 'Carrickmacross, Ireland');

-- Create user roles enum for club admins
CREATE TYPE public.app_role AS ENUM ('club_admin', 'user');

-- Create user_roles table for club administration
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, club_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check club admin role
CREATE OR REPLACE FUNCTION public.is_club_admin(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND club_id = _club_id
      AND role = 'club_admin'
  )
$$;

-- Create policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Club admins can manage roles in their club" ON public.user_roles
FOR ALL
USING (public.is_club_admin(auth.uid(), club_id));

-- Update ladders table to allow club admins to insert/update/delete
CREATE POLICY "Club admins can manage ladders" ON public.ladders
FOR ALL
USING (public.is_club_admin(auth.uid(), club_id));

-- Create subscription plans table for club billing
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price_per_member_monthly INTEGER NOT NULL, -- price in cents per member per month
    max_ladders INTEGER,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, price_per_member_monthly, max_ladders, features) VALUES
('Basic', 100, 5, '["ELO Rankings", "Match Recording", "Basic Stats"]'::jsonb),
('Premium', 150, 20, '["ELO Rankings", "Match Recording", "Advanced Stats", "Tournament Mode", "Custom Reports"]'::jsonb),
('Enterprise', 200, NULL, '["ELO Rankings", "Match Recording", "Advanced Stats", "Tournament Mode", "Custom Reports", "API Access", "Priority Support"]'::jsonb);

-- Create club subscriptions table
CREATE TABLE public.club_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    current_member_count INTEGER NOT NULL DEFAULT 0,
    monthly_amount INTEGER NOT NULL, -- calculated amount in cents
    status TEXT NOT NULL DEFAULT 'active', -- active, cancelled, past_due
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on subscription tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription tables
CREATE POLICY "Everyone can view subscription plans" ON public.subscription_plans
FOR SELECT
USING (true);

CREATE POLICY "Club admins can view their club subscription" ON public.club_subscriptions
FOR SELECT
USING (public.is_club_admin(auth.uid(), club_id));

-- Create trigger for updating club subscription member counts
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_club_subscription_count
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_club_member_count();