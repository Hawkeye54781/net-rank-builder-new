-- Create booking domain schema (courts, bookings, blockouts, hours, policies)
-- Safe to run multiple times in dev; guarded with IF NOT EXISTS
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- Courts
create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists courts_club_active_idx on public.courts (club_id, is_active);
create index if not exists courts_club_display_idx on public.courts (club_id, display_order);

-- Court bookings
create table if not exists public.court_bookings (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete cascade,
  booked_by_profile_id uuid not null references public.profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  canceled_at timestamptz,
  canceled_by_profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists court_bookings_court_start_idx on public.court_bookings (court_id, start_time);
create index if not exists court_bookings_club_start_idx on public.court_bookings (club_id, start_time);
create index if not exists court_bookings_profile_start_idx on public.court_bookings (booked_by_profile_id, start_time);

-- Exclusion constraint to prevent overlaps on the same court (confirmed only)
alter table public.court_bookings
  add constraint court_no_overlap
  exclude using gist (
    court_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  )
  where (status = 'confirmed');

-- One-off blockouts
create table if not exists public.court_blockouts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  court_id uuid references public.courts(id), -- null => club-wide
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists court_blockouts_club_start_idx on public.court_blockouts (club_id, start_time);
create index if not exists court_blockouts_court_start_idx on public.court_blockouts (court_id, start_time);

-- Same-everyday hours
create table if not exists public.club_hours (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  open_time time not null,
  close_time time not null
);

-- Booking policies (defaults per MVP)
create table if not exists public.booking_policies (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  slot_increment_minutes int not null default 30,
  max_duration_minutes int not null default 90,
  max_advance_days int not null default 7,
  max_active_bookings_per_member int not null default 2,
  min_cancel_notice_minutes int not null default 60
);
