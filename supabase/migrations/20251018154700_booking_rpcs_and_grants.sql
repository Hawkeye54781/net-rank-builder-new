-- RPCs and grants for booking domain

-- Create booking (atomic)
create or replace function public.create_booking_if_available(
  _club_id uuid,
  _court_id uuid,
  _booked_by_profile_id uuid,
  _start timestamptz,
  _end timestamptz,
  _allow_override boolean default false
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
v_is_admin boolean := public.is_club_admin(_club_id, auth.uid());
  v_profile record;
  v_policies record;
  v_hours record;
  v_now timestamptz := now();
  v_duration_minutes int := floor(extract(epoch from (_end - _start)) / 60);
  v_new_id uuid;
begin
  if _end <= _start then
    raise exception 'End must be after start';
  end if;

  select id, user_id, club_id into v_profile
  from public.profiles
  where id = _booked_by_profile_id;

  if not found or v_profile.club_id <> _club_id then
    raise exception 'Profile does not belong to club';
  end if;

  if not v_is_admin and v_profile.user_id <> auth.uid() then
    raise exception 'Not allowed to book for another member';
  end if;

  select
    coalesce(slot_increment_minutes, 30) as slot_increment_minutes,
    coalesce(max_duration_minutes, 90) as max_duration_minutes,
    coalesce(max_advance_days, 7) as max_advance_days,
    coalesce(max_active_bookings_per_member, 2) as max_active_bookings_per_member,
    coalesce(min_cancel_notice_minutes, 60) as min_cancel_notice_minutes
  into v_policies
  from public.booking_policies
  where club_id = _club_id;

  if extract(minute from _start) not in (0,30) or extract(minute from _end) not in (0,30) then
    raise exception 'Start and end must align to 00 or 30 minutes';
  end if;

  if v_duration_minutes not in (30,60,90) then
    raise exception 'Duration must be 30, 60, or 90 minutes';
  end if;

  if v_duration_minutes > v_policies.max_duration_minutes then
    raise exception 'Duration exceeds max allowed % minutes', v_policies.max_duration_minutes;
  end if;

  if _start < v_now then
    raise exception 'Cannot book in the past';
  end if;

  if not v_is_admin or not _allow_override then
    if _start > v_now + make_interval(days => v_policies.max_advance_days) then
      raise exception 'Start exceeds % day advance window', v_policies.max_advance_days;
    end if;
  end if;

  select open_time, close_time into v_hours
  from public.club_hours
  where club_id = _club_id;

  if found then
    if (_start at time zone 'UTC')::time < v_hours.open_time then
      raise exception 'Start is before club open time';
    end if;
    if (_end at time zone 'UTC')::time > v_hours.close_time then
      raise exception 'End is after club close time';
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(_court_id::text, 0));

  if exists (
    select 1 from public.court_blockouts b
    where b.club_id = _club_id
      and (b.court_id is null or b.court_id = _court_id)
      and tstzrange(b.start_time, b.end_time, '[)') && tstzrange(_start, _end, '[)')
  ) then
    raise exception 'Time is blocked out';
  end if;

  if exists (
    select 1 from public.court_bookings cb
    where cb.court_id = _court_id
      and cb.status = 'confirmed'
      and tstzrange(cb.start_time, cb.end_time, '[)') && tstzrange(_start, _end, '[)')
  ) then
    raise exception 'Court already booked for that time';
  end if;

  if not v_is_admin or not _allow_override then
    if (
      select count(*) from public.court_bookings cb2
      where cb2.booked_by_profile_id = _booked_by_profile_id
        and cb2.status = 'confirmed'
        and cb2.start_time >= v_now
    ) >= v_policies.max_active_bookings_per_member then
      raise exception 'Member has reached max active future bookings (%).', v_policies.max_active_bookings_per_member;
    end if;
  end if;

  insert into public.court_bookings (
    club_id, court_id, booked_by_profile_id, start_time, end_time, status
  ) values (
    _club_id, _court_id, _booked_by_profile_id, _start, _end, 'confirmed'
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.create_booking_if_available(uuid, uuid, uuid, timestamptz, timestamptz, boolean) to authenticated;

-- Cancel booking
create or replace function public.cancel_booking(
  _booking_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b record;
  v_is_admin boolean;
  v_policies record;
  v_now timestamptz := now();
  v_canceler_profile_id uuid;
begin
  select * into v_b
  from public.court_bookings
  where id = _booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  if v_b.status = 'cancelled' then
    return;
  end if;

v_is_admin := public.is_club_admin(v_b.club_id, auth.uid());

  select p.id into v_canceler_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.club_id = v_b.club_id
  limit 1;

  if not v_is_admin and (v_canceler_profile_id is null or v_canceler_profile_id <> v_b.booked_by_profile_id) then
    raise exception 'Not authorized to cancel this booking';
  end if;

  select coalesce(min_cancel_notice_minutes, 60) as min_cancel_notice_minutes
  into v_policies
  from public.booking_policies
  where club_id = v_b.club_id;

  if not v_is_admin then
    if v_now > v_b.start_time - make_interval(mins => v_policies.min_cancel_notice_minutes) then
      raise exception 'Cannot cancel within % minutes of start', v_policies.min_cancel_notice_minutes;
    end if;
  end if;

  update public.court_bookings
  set status = 'cancelled',
      canceled_at = v_now,
      canceled_by_profile_id = coalesce(v_canceler_profile_id, v_b.booked_by_profile_id)
  where id = _booking_id;
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;

-- Privilege hygiene
revoke insert, update, delete on public.court_bookings from anon, authenticated;
