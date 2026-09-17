// Supabase Edge Function: ai-reply-comment
// Triggered by a Database Webhook on INSERT into public.log_comments.
// When someone (a human, not an AI) comments on YOUR post, your own AI persona
// replies to them in character.
//
// Deploy:  supabase functions deploy ai-reply-comment --no-verify-jwt
// Secret:  OPENAI_API_KEY (already set). Service key auto-injected.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY =
  Deno.env.get("SB_SECRET_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const GUARDRAILS = `You are an AI persona replying to a comment on your owner's
meal post, on their behalf, in character. Rules that always win:
- Reply directly to what the commenter said. 1 to 2 sentences.
- Playful, never cruel, no medical advice. 0-2 emoji if it fits.
- Output ONLY the reply text.
- Reply in the same language the persona would naturally use (Vietnamese personas reply in Vietnamese; otherwise match the commenter's language).`;

const MAX_RESPONDERS = 3;
const PROFILE_COLS = "id, ai_name, ai_emoji, ai_prompt, ai_enabled, ai_autocomment";

serve(async (req) => {
  try {
    const payload = await req.json();
    const c = payload.record ?? payload;
    if (!c?.id || !c?.log_id) return ok("no comment");
    if (c.is_ai) return ok("skip: ai comment"); // never reply to AI (no loops)

    const { data: log } = await admin
      .from("food_logs")
      .select("id, user_id, meal_name, calories")
      .eq("id", c.log_id)
      .single();
    if (!log) return ok("no log");

    // Build the set of AI personas that should answer this human comment:
    // the post owner's AI + any AI persona already in this post's thread.
    // Exclude the commenter themselves (no talking to your own AI).
    const responderIds = new Set<string>();
    if (log.user_id !== c.user_id) responderIds.add(log.user_id);

    const { data: aiComments } = await admin
      .from("log_comments")
      .select("user_id")
      .eq("log_id", log.id)
      .eq("is_ai", true);
    for (const row of aiComments ?? []) {
      if (row.user_id !== c.user_id) responderIds.add(row.user_id);
    }
    if (responderIds.size === 0) return ok("no responders");

    const ids = Array.from(responderIds).slice(0, MAX_RESPONDERS);
    const { data: profiles } = await admin
      .from("profiles")
      .select(PROFILE_COLS)
      .in("id", ids)
      .eq("ai_enabled", true)
      .eq("ai_autocomment", true);
    if (!profiles || profiles.length === 0) return ok("no active personas");

    const { data: commenter } = await admin
      .from("profiles")
      .select("display_name, username")
      .eq("id", c.user_id)
      .single();
    const who = commenter?.display_name || commenter?.username || "someone";
    const mealDesc = [log.meal_name, log.calories && `${log.calories} cal`]
      .filter(Boolean)
      .join(", ");

    let replies = 0;
    let firstName = "";
    let firstEmoji = "";
    for (const p of profiles) {
      try {
        const reply = await generate(p, who, c.body, mealDesc);
        if (reply) {
          await admin.from("log_comments").insert({
            log_id: log.id,
            user_id: p.id,
            body: reply,
            is_ai: true,
            ai_name: p.ai_name,
            ai_emoji: p.ai_emoji,
          });
          replies++;
          if (!firstName) {
            firstName = p.ai_name;
            firstEmoji = p.ai_emoji ?? "🤖";
          }
        }
      } catch (_) {
        /* skip this persona on error */
      }
    }

    // Notify the human commenter that an AI replied (fires the push webhook).
    if (replies > 0) {
      const body =
        replies === 1
          ? `${firstEmoji} ${firstName} replied to your comment`
          : `${firstEmoji} ${firstName} and ${replies - 1} more replied to your comment`;
      await admin.from("notifications").insert({
        user_id: c.user_id,
        type: "comment",
        actor_id: log.user_id,
        log_id: log.id,
        body,
      });
    }
    return ok("replied");
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

async function generate(
  owner: any,
  who: string,
  commentBody: string,
  mealDesc: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 1.0,
      max_tokens: 120,
      messages: [
        { role: "system", content: GUARDRAILS },
        { role: "system", content: `PERSONA (${owner.ai_name}): ${owner.ai_prompt}` },
        {
          role: "user",
          content: `On your post (${mealDesc}), ${who} commented: "${commentBody}". Reply to them.`,
        },
      ],
    }),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim().replace(/^["']|["']$/g, "");
}

function ok(msg: string) {
  return new Response(JSON.stringify({ ok: msg }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
