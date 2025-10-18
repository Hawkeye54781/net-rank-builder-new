-- New club self-serve signup + billing/trial groundwork (Option B: RPC)
-- 2025-10-18

-- 1) Clubs: billing + trial columns and slug
ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS billing_agreed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_agreed_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_start_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_end_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'trialing', -- trialing | active | past_due | canceled
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'basic', -- basic | plus (<=150 => basic; >150 => plus)
  ADD COLUMN IF NOT EXISTS user_seat_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slug for existing rows
UPDATE public.clubs
SET slug = lower(regexp_replace(name, '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Ensure unique slugs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'clubs_slug_key'
  ) THEN
    CREATE UNIQUE INDEX clubs_slug_key ON public.clubs(slug);
  END IF;
END $$;

-- 2) Utility functions: seats -> tier, lock state, and seat count
CREATE OR REPLACE FUNCTION public.club_user_count(p_club_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::int FROM public.profiles p WHERE p.club_id = p_club_id;
$$;

CREATE OR REPLACE FUNCTION public.derive_plan_tier(p_seats integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN p_seats > 150 THEN 'plus' ELSE 'basic' END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_locked(p_club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (now() >= c.trial_end_at AND c.billing_status <> 'active')
  FROM public.clubs c
  WHERE c.id = p_club_id;
$$;

-- Maintain seat count and derived tier on profile changes
CREATE OR REPLACE FUNCTION public.update_club_seat_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_club_id uuid;
  v_count integer;
BEGIN
  v_club_id := COALESCE(NEW.club_id, OLD.club_id);
  IF v_club_id IS NULL THEN
    RETURN NULL;
  END IF;
  v_count := public.club_user_count(v_club_id);
  UPDATE public.clubs c
     SET user_seat_count = v_count,
         plan_tier = public.derive_plan_tier(v_count)
   WHERE c.id = v_club_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS t_profiles_seatcount ON public.profiles;
CREATE TRIGGER t_profiles_seatcount
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_club_seat_count();

-- 3) RLS policies
-- Allow authenticated users to insert their own club when they have agreed to billing (enforced via row data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clubs' AND policyname = 'Users can create their own club with billing consent'
  ) THEN
    DROP POLICY "Users can create their own club with billing consent" ON public.clubs;
  END IF;
END $$;
;
CREATE POLICY "Users can create their own club with billing consent" ON public.clubs
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND billing_agreed = true
);

-- user_roles policies: allow club creator to self-assign admin on their club
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Club creator can self-assign admin'
  ) THEN
    CREATE POLICY "Club creator can self-assign admin" ON public.user_roles
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid() AND role = 'club_admin' AND club_id IN (
        SELECT id FROM public.clubs WHERE created_by = auth.uid()
      )
    );
  END IF;
END $$;

-- Tighten existing user_roles admin policies to respect billing lock
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Club admins can view roles in their club') THEN
    DROP POLICY "Club admins can view roles in their club" ON public.user_roles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Club admins can add admins in their club') THEN
    DROP POLICY "Club admins can add admins in their club" ON public.user_roles;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Club admins can remove admins in their club') THEN
    DROP POLICY "Club admins can remove admins in their club" ON public.user_roles;
  END IF;
END $$;

CREATE POLICY "Club admins can view roles in their club" ON public.user_roles
FOR SELECT TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id)
);

CREATE POLICY "Club admins can add admins in their club" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id) AND role = 'club_admin' AND NOT public.is_admin_locked(club_id)
);

CREATE POLICY "Club admins can remove admins in their club" ON public.user_roles
FOR DELETE TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id) AND role = 'club_admin' AND NOT public.is_admin_locked(club_id)
);

-- Ladders: require admin and not locked for write operations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ladders' AND policyname='Club admins can manage ladders') THEN
    DROP POLICY "Club admins can manage ladders" ON public.ladders;
  END IF;
END $$;

CREATE POLICY "Club admins can manage ladders (billing ok)" ON public.ladders
FOR ALL TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id) AND NOT public.is_admin_locked(club_id)
)
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id) AND NOT public.is_admin_locked(club_id)
);

-- 4) RPC: create_club_and_assign_admin
CREATE OR REPLACE FUNCTION public.create_club_and_assign_admin(
  p_name text,
  p_location text,
  p_billing_agreed boolean
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_club_id uuid;
  v_slug_base text;
  v_slug text;
  v_try int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT COALESCE(p_billing_agreed, false) THEN
    RAISE EXCEPTION 'Billing agreement required';
  END IF;

  v_slug_base := lower(regexp_replace(p_name, '[^a-z0-9]+', '-', 'g'));
  v_slug := v_slug_base;
  WHILE EXISTS(SELECT 1 FROM public.clubs WHERE slug = v_slug) LOOP
    v_try := v_try + 1;
    v_slug := v_slug_base || '-' || v_try::text;
  END LOOP;

  INSERT INTO public.clubs(name, location, slug, created_by, billing_agreed, billing_agreed_at,
                           trial_start_at, trial_end_at, billing_status)
  VALUES (p_name, p_location, v_slug, v_user_id, true, now(), now(), now() + interval '7 days', 'trialing')
  RETURNING id INTO v_club_id;

  -- Move the user into the newly created club
  UPDATE public.profiles
     SET club_id = v_club_id
   WHERE user_id = v_user_id;

  -- Make the creator a club admin
  INSERT INTO public.user_roles(user_id, club_id, role)
  VALUES (v_user_id, v_club_id, 'club_admin')
  ON CONFLICT DO NOTHING;

  RETURN v_club_id;
END
$$;

GRANT EXECUTE ON FUNCTION public.create_club_and_assign_admin(text, text, boolean) TO authenticated;