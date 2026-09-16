-- ============================================================================
-- PlatePal — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Includes tables, Row Level Security policies, triggers and a storage bucket.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  username           text unique not null,
  display_name       text,
  avatar_url         text,
  bio                text,
  daily_calorie_goal int  not null default 2000,
  protein_goal_g     int  not null default 140,
  carbs_goal_g       int  not null default 220,
  fat_goal_g         int  not null default 70,
  streak_count       int  not null default 0,
  expo_push_token    text,
  created_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- friendships  (directed request, single row per pair)
-- ----------------------------------------------------------------------------
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','accepted','blocked')),
  created_at   timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- ----------------------------------------------------------------------------
-- tracker_circle  (friends who auto-receive owner's logs + push)
-- ----------------------------------------------------------------------------
create table if not exists public.tracker_circle (
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  member_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, member_id),
  check (owner_id <> member_id)
);

-- ----------------------------------------------------------------------------
-- food_logs
-- ----------------------------------------------------------------------------
create table if not exists public.food_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  meal_name     text not null,
  serving_size  text,
  calories      int  not null default 0,
  protein_g     int  not null default 0,
  carbs_g       int  not null default 0,
  fat_g         int  not null default 0,
  meal_type     text not null default 'snack'
                check (meal_type in ('breakfast','lunch','dinner','snack')),
  photo_url     text,
  drive_file_id text,
  ai_confidence real,
  notes         text,
  logged_at     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists food_logs_user_logged_idx
  on public.food_logs (user_id, logged_at desc);

-- ----------------------------------------------------------------------------
-- log_likes / log_comments
-- ----------------------------------------------------------------------------
create table if not exists public.log_likes (
  id         uuid primary key default gen_random_uuid(),
  log_id     uuid not null references public.food_logs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (log_id, user_id)
);

create table if not exists public.log_comments (
  id         uuid primary key default gen_random_uuid(),
  log_id     uuid not null references public.food_logs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- notifications  (in-app inbox; a trigger also fires push via edge function)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  actor_id   uuid references public.profiles(id) on delete set null,
  log_id     uuid references public.food_logs(id) on delete cascade,
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- ============================================================================
-- Helper: are two users friends?
-- ============================================================================
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- ============================================================================
-- Trigger: when a new food_log is inserted, notify everyone in the
-- author's tracker circle. The notifications insert is picked up by a
-- database webhook → send-notification edge function (see README).
-- ============================================================================
create or replace function public.notify_circle_on_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  author_name text;
  member record;
begin
  select coalesce(display_name, username) into author_name
  from public.profiles where id = new.user_id;

  for member in
    select member_id from public.tracker_circle where owner_id = new.user_id
  loop
    insert into public.notifications (user_id, type, actor_id, log_id, body)
    values (
      member.member_id,
      'new_log',
      new.user_id,
      new.id,
      author_name || ' logged ' || new.meal_name || ' (' || new.calories || ' cal)'
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_circle_on_log on public.food_logs;
create trigger trg_notify_circle_on_log
  after insert on public.food_logs
  for each row execute function public.notify_circle_on_log();

-- ============================================================================
-- Trigger: notifications for likes and comments
-- ============================================================================
create or replace function public.notify_on_like()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid; actor_name text; meal text;
begin
  select fl.user_id, fl.meal_name into owner_id, meal
  from public.food_logs fl where fl.id = new.log_id;
  if owner_id = new.user_id then return new; end if; -- no self-notify
  select coalesce(display_name, username) into actor_name
  from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, type, actor_id, log_id, body)
  values (owner_id, 'like', new.user_id, new.log_id,
          actor_name || ' liked your ' || meal);
  return new;
end;
$$;

drop trigger if exists trg_notify_on_like on public.log_likes;
create trigger trg_notify_on_like
  after insert on public.log_likes
  for each row execute function public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid; actor_name text; meal text;
begin
  select fl.user_id, fl.meal_name into owner_id, meal
  from public.food_logs fl where fl.id = new.log_id;
  if owner_id = new.user_id then return new; end if;
  select coalesce(display_name, username) into actor_name
  from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, type, actor_id, log_id, body)
  values (owner_id, 'comment', new.user_id, new.log_id,
          actor_name || ' commented on your ' || meal);
  return new;
end;
$$;

drop trigger if exists trg_notify_on_comment on public.log_comments;
create trigger trg_notify_on_comment
  after insert on public.log_comments
  for each row execute function public.notify_on_comment();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.friendships    enable row level security;
alter table public.tracker_circle enable row level security;
alter table public.food_logs      enable row level security;
alter table public.log_likes      enable row level security;
alter table public.log_comments   enable row level security;
alter table public.notifications  enable row level security;

-- profiles: anyone signed-in can read (needed for search); only you edit yours
drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- friendships: visible to either party; created by requester; updated by addressee
drop policy if exists "friendship read" on public.friendships;
create policy "friendship read" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendship insert" on public.friendships;
create policy "friendship insert" on public.friendships
  for insert with check (auth.uid() = requester_id);

drop policy if exists "friendship update" on public.friendships;
create policy "friendship update" on public.friendships
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friendship delete" on public.friendships;
create policy "friendship delete" on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- tracker_circle: owner manages; member can see they were added
drop policy if exists "circle read" on public.tracker_circle;
create policy "circle read" on public.tracker_circle
  for select using (auth.uid() = owner_id or auth.uid() = member_id);

drop policy if exists "circle write" on public.tracker_circle;
create policy "circle write" on public.tracker_circle
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- food_logs: readable by author or accepted friends; writable by author
drop policy if exists "logs read" on public.food_logs;
create policy "logs read" on public.food_logs
  for select using (
    auth.uid() = user_id or public.are_friends(auth.uid(), user_id)
  );

drop policy if exists "logs insert" on public.food_logs;
create policy "logs insert" on public.food_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "logs update" on public.food_logs;
create policy "logs update" on public.food_logs
  for update using (auth.uid() = user_id);

drop policy if exists "logs delete" on public.food_logs;
create policy "logs delete" on public.food_logs
  for delete using (auth.uid() = user_id);

-- likes / comments: readable if you can read the log; write your own
drop policy if exists "likes read" on public.log_likes;
create policy "likes read" on public.log_likes
  for select using (
    exists (select 1 from public.food_logs fl where fl.id = log_id
            and (fl.user_id = auth.uid() or public.are_friends(auth.uid(), fl.user_id)))
  );
drop policy if exists "likes write" on public.log_likes;
create policy "likes write" on public.log_likes
  for insert with check (auth.uid() = user_id);
drop policy if exists "likes delete" on public.log_likes;
create policy "likes delete" on public.log_likes
  for delete using (auth.uid() = user_id);

drop policy if exists "comments read" on public.log_comments;
create policy "comments read" on public.log_comments
  for select using (
    exists (select 1 from public.food_logs fl where fl.id = log_id
            and (fl.user_id = auth.uid() or public.are_friends(auth.uid(), fl.user_id)))
  );
drop policy if exists "comments write" on public.log_comments;
create policy "comments write" on public.log_comments
  for insert with check (auth.uid() = user_id);
drop policy if exists "comments delete" on public.log_comments;
create policy "comments delete" on public.log_comments
  for delete using (auth.uid() = user_id);

-- notifications: recipient reads/updates; trigger inserts run as definer, and a
-- user may insert a notification only where they are the actor (e.g. adding
-- someone to their tracker circle).
drop policy if exists "notif read" on public.notifications;
create policy "notif read" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "notif update" on public.notifications;
create policy "notif update" on public.notifications
  for update using (auth.uid() = user_id);
drop policy if exists "notif insert" on public.notifications;
create policy "notif insert" on public.notifications
  for insert with check (auth.uid() = actor_id);

-- ============================================================================
-- Storage bucket for meal photos (fallback when not using Google Drive)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;

drop policy if exists "meal photos read" on storage.objects;
create policy "meal photos read" on storage.objects
  for select using (bucket_id = 'meal-photos');

drop policy if exists "meal photos write" on storage.objects;
create policy "meal photos write" on storage.objects
  for insert with check (
    bucket_id = 'meal-photos' and auth.role() = 'authenticated'
  );

-- ============================================================================
-- View: feed_logs — logs from me + my accepted friends, with counts
-- ============================================================================
create or replace view public.feed_logs as
select
  fl.*,
  p.username,
  p.display_name,
  p.avatar_url,
  (select count(*) from public.log_likes    l where l.log_id = fl.id) as like_count,
  (select count(*) from public.log_comments c where c.log_id = fl.id) as comment_count
from public.food_logs fl
join public.profiles p on p.id = fl.user_id;

-- ============================================================================
-- Daily totals helper (used by the tracker screen)
-- ============================================================================
create or replace function public.daily_totals(target_user uuid, day date)
returns table (calories int, protein_g int, carbs_g int, fat_g int, log_count int)
language sql stable security definer set search_path = public as $$
  select
    coalesce(sum(calories),0)::int,
    coalesce(sum(protein_g),0)::int,
    coalesce(sum(carbs_g),0)::int,
    coalesce(sum(fat_g),0)::int,
    count(*)::int
  from public.food_logs
  where user_id = target_user
    and logged_at >= day::timestamptz
    and logged_at < (day + 1)::timestamptz;
$$;
