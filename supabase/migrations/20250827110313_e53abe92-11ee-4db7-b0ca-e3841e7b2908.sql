-- Update subscription pricing to more affordable rates
-- Basic: €3 per 100 members monthly
-- Premium: €5 per 100 members monthly
-- Enterprise: €8 per 100 members monthly

UPDATE public.subscription_plans 
SET price_per_100_members_monthly = 300  -- €3.00 in cents
WHERE name = 'Basic';

UPDATE public.subscription_plans 
SET price_per_100_members_monthly = 500  -- €5.00 in cents
WHERE name = 'Premium';

UPDATE public.subscription_plans 
SET price_per_100_members_monthly = 800  -- €8.00 in cents
WHERE name = 'Enterprise';