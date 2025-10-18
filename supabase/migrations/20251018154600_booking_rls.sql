-- RLS and policies for booking domain

alter table public.courts enable row level security;
alter table public.court_bookings enable row level security;
alter table public.court_blockouts enable row level security;
alter table public.club_hours enable row level security;
alter table public.booking_policies enable row level security;

-- courts
create policy courts_select_members
on public.courts
for select
using (
  exists (
    select 1 from public.profiles p 
    where p.user_id = auth.uid() and p.club_id = club_id
  )
);

create policy courts_insert_admin
on public.courts
for insert
with check (public.is_club_admin(club_id, auth.uid()));

create policy courts_update_admin
on public.courts
for update
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

create policy courts_delete_admin
on public.courts
for delete
using (public.is_club_admin(club_id, auth.uid()));

-- court_blockouts
create policy blockouts_select_members
on public.court_blockouts
for select
using (
  exists (
    select 1 from public.profiles p 
    where p.user_id = auth.uid() and p.club_id = club_id
  )
);

create policy blockouts_insert_admin
on public.court_blockouts
for insert
with check (public.is_club_admin(club_id, auth.uid()));

create policy blockouts_update_admin
on public.court_blockouts
for update
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

create policy blockouts_delete_admin
on public.court_blockouts
for delete
using (public.is_club_admin(club_id, auth.uid()));

-- club_hours
create policy hours_select_members
on public.club_hours
for select
using (
  exists (
    select 1 from public.profiles p 
    where p.user_id = auth.uid() and p.club_id = club_id
  )
);

create policy hours_upsert_admin
on public.club_hours
for all
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

-- booking_policies
create policy policies_select_members
on public.booking_policies
for select
using (
  exists (
    select 1 from public.profiles p 
    where p.user_id = auth.uid() and p.club_id = club_id
  )
);

create policy policies_upsert_admin
on public.booking_policies
for all
using (public.is_club_admin(club_id, auth.uid()))
with check (public.is_club_admin(club_id, auth.uid()));

-- court_bookings: read allowed to club members, mutations via RPC only
create policy bookings_select_members
on public.court_bookings
for select
using (
  exists (
    select 1 from public.profiles p 
    where p.user_id = auth.uid() and p.club_id = club_id
  )
);
