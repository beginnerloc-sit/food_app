-- ============================================================================
-- Migration: AI persona + Supabase-only storage cleanup
-- Safe to run on a database that already ran the ORIGINAL schema.sql.
-- Every statement is idempotent (IF [NOT] EXISTS), so re-running is harmless.
-- Apply via: Supabase SQL editor, or `supabase db push`.
-- ============================================================================

-- ── profiles: custom AI persona the user designs ────────────────────────────
alter table public.profiles
  add column if not exists ai_name       text    not null default 'Sidekick',
  add column if not exists ai_emoji      text    not null default '🤖',
  add column if not exists ai_prompt     text    not null default
    'You are an upbeat, funny food buddy who cheers me on and cracks jokes about my meals.',
  add column if not exists ai_enabled    boolean not null default false,
  add column if not exists ai_autocomment boolean not null default true;

-- ── log_comments: AI-authored comments ──────────────────────────────────────
alter table public.log_comments
  add column if not exists is_ai    boolean not null default false,
  add column if not exists ai_name  text,
  add column if not exists ai_emoji text;

-- ── food_logs: Google Drive support removed (Supabase Storage only) ──────────
-- The feed_logs view selects fl.*, so it depends on drive_file_id. Drop the
-- view first, remove the column, then recreate the view.
drop view if exists public.feed_logs;

alter table public.food_logs
  drop column if exists drive_file_id;

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

-- ── notifications: allow a user to insert a notification where they are the
--    actor (e.g. adding someone to their tracker circle). Added after the very
--    first schema; included here for databases that predate it. ──────────────
drop policy if exists "notif insert" on public.notifications;
create policy "notif insert" on public.notifications
  for insert with check (auth.uid() = actor_id);
