// Supabase Edge Function: send-notification
// Triggered by a Database Webhook on INSERT into public.notifications.
// Looks up the recipient's Expo push token and delivers a push via Expo.
//
// Deploy:  supabase functions deploy send-notification --no-verify-jwt
//
// Auth key: needs a key that can read any user's push token (bypasses RLS).
//   Supabase AUTO-INJECTS SUPABASE_SERVICE_ROLE_KEY into every function, so
//   normally you set NOTHING. If you'd rather use the new secret key
//   (sb_secret_...), set it yourself:  supabase secrets set SB_SECRET_KEY=sb_secret_...
//
// Set up the webhook in Supabase Dashboard:
//   Database → Webhooks → Create
//     table: notifications, events: INSERT
//     type: Supabase Edge Function → send-notification

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Prefer a manually-set new secret key, else the auto-injected service key.
const SERVICE_KEY =
  Deno.env.get("SB_SECRET_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const titleFor: Record<string, string> = {
  new_log: "🍽️ New meal logged",
  like: "❤️ Someone liked your meal",
  comment: "💬 New comment",
  friend_request: "👋 New friend request",
  friend_accepted: "🤝 Friend request accepted",
  added_to_circle: "✨ Added to a tracker circle",
};

serve(async (req) => {
  try {
    const payload = await req.json();
    // Database webhook shape: { type, table, record, old_record }
    const record = payload.record ?? payload;
    const { user_id, type, body, log_id } = record;
    if (!user_id) return new Response("no user", { status: 200 });

    const { data: profile } = await admin
      .from("profiles")
      .select("expo_push_token")
      .eq("id", user_id)
      .single();

    const token = profile?.expo_push_token;
    if (!token) return new Response("no token", { status: 200 });

    const message = {
      to: token,
      sound: "default",
      title: titleFor[type] ?? "PlatePal",
      body: body ?? "You have a new notification",
      data: { type, log_id },
      priority: "high",
    };

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
