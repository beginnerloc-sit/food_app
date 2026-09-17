-- ============================================================================
-- AI social triggers: friends' AIs auto-comment on new meals, and AIs reply to
-- human comments. Both call edge functions via pg_net.
-- Replace <PROJECT_REF> and <PUBLISHABLE_KEY> before running (not secret).
-- Requires: pg_net, and the ai-friends-comment + ai-reply-comment functions
-- deployed with --no-verify-jwt.
-- ============================================================================

create extension if not exists pg_net;

-- Friends' AI personas comment when someone posts a meal.
create or replace function public.on_new_log_ai_comments()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/ai-friends-comment',
    body := jsonb_build_object('type','INSERT','table','food_logs','record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','<PUBLISHABLE_KEY>',
      'Authorization','Bearer <PUBLISHABLE_KEY>'
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

drop trigger if exists trg_ai_friends_comment on public.food_logs;
create trigger trg_ai_friends_comment
  after insert on public.food_logs
  for each row execute function public.on_new_log_ai_comments();

-- When a human comments, the post owner's AI (and any AI already in the thread)
-- replies. Skips AI comments so there are no loops.
create or replace function public.on_new_comment_ai_reply()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_ai then return new; end if;
  perform net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/ai-reply-comment',
    body := jsonb_build_object('type','INSERT','table','log_comments','record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','<PUBLISHABLE_KEY>',
      'Authorization','Bearer <PUBLISHABLE_KEY>'
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

drop trigger if exists trg_ai_reply_comment on public.log_comments;
create trigger trg_ai_reply_comment
  after insert on public.log_comments
  for each row execute function public.on_new_comment_ai_reply();
