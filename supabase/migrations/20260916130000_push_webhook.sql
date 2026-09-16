-- ============================================================================
-- Push delivery wiring (replaces the dashboard "Database Webhook").
-- Newer Supabase dashboards moved Webhooks to Integrations → Webhooks; this
-- migration does the same thing in SQL so no UI step is needed.
--
-- A Database Webhook is just a trigger that calls pg_net. Here we POST every
-- new `notifications` row to the send-notification edge function.
--
-- BEFORE RUNNING: replace the two placeholders below.
--   <PROJECT_REF>       your project ref (subdomain of your Supabase URL)
--   <PUBLISHABLE_KEY>   your publishable key (sb_publishable_...) — NOT secret;
--                       it's only used as the gateway apikey. send-notification
--                       is deployed with --no-verify-jwt so no JWT is required.
-- ============================================================================

create extension if not exists pg_net;

create or replace function public.push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-notification',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'schema', 'public',
      'record', to_jsonb(new)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '<PUBLISHABLE_KEY>',
      'Authorization', 'Bearer <PUBLISHABLE_KEY>'
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

drop trigger if exists trg_push_on_notification on public.notifications;
create trigger trg_push_on_notification
  after insert on public.notifications
  for each row execute function public.push_on_notification();

-- Delivery history / debugging:  select * from net._http_response order by created desc;
