// Supabase Edge Function: ai-friends-comment
// Triggered by a Database Webhook on INSERT into public.food_logs.
// For each accepted friend of the meal's author who has an AI persona enabled
// with auto-comment on, generate an in-character comment and insert it.
//
// Deploy:  supabase functions deploy ai-friends-comment --no-verify-jwt
// Secret:  OPENAI_API_KEY (already set). Service key is auto-injected.

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

const MAX_FRIENDS = 3; // cap OpenAI calls per post

const GUARDRAILS = `You are an AI character in a social food app, commenting on a
FRIEND's meal post. You are given the conversation so far. Decide naturally
whether to reply to someone's comment (reference them) or just react to the meal.
Stay in your persona. Rules that always win:
- 1 to 2 sentences. Don't repeat what's already been said.
- Playful, never cruel, no body-shaming, no medical advice.
- 0-2 emoji if it fits. Output ONLY the comment text.
- Reply in the language the persona would naturally use (Vietnamese personas reply in Vietnamese).`;

serve(async (req) => {
  try {
    const payload = await req.json();
    const log = payload.record ?? payload;
    if (!log?.id || !log?.user_id) return ok("no log");

    // accepted friends of the author
    const { data: fr } = await admin
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${log.user_id},addressee_id.eq.${log.user_id}`);

    const friendIds = (fr ?? [])
      .map((f: any) =>
        f.requester_id === log.user_id ? f.addressee_id : f.requester_id
      )
      .filter((x: string) => x && x !== log.user_id);
    if (friendIds.length === 0) return ok("no friends");

    // friends with an enabled auto-commenting persona
    const { data: personas } = await admin
      .from("profiles")
      .select("id, ai_name, ai_emoji, ai_prompt, ai_enabled, ai_autocomment")
      .in("id", friendIds)
      .eq("ai_enabled", true)
      .eq("ai_autocomment", true)
      .limit(MAX_FRIENDS);

    if (!personas || personas.length === 0) return ok("no personas");

    const mealDesc = [log.meal_name, log.calories && `${log.calories} cal`, log.serving_size]
      .filter(Boolean)
      .join(", ");
    const thread = await buildThread(log.id);

    for (const p of personas) {
      try {
        const text = await generate(p, mealDesc, thread);
        if (text) {
          await admin.from("log_comments").insert({
            log_id: log.id,
            user_id: p.id,
            body: text,
            is_ai: true,
            ai_name: p.ai_name,
            ai_emoji: p.ai_emoji,
          });
        }
      } catch (_) {
        /* skip this friend on error */
      }
    }
    return ok("done");
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

async function buildThread(logId: string): Promise<string> {
  const { data } = await admin
    .from("log_comments")
    .select(
      `body, is_ai, ai_name, created_at, author:profiles!log_comments_user_id_fkey(display_name, username)`
    )
    .eq("log_id", logId)
    .order("created_at", { ascending: true })
    .limit(20);
  return (data ?? [])
    .map((c: any) => {
      const name = c.is_ai
        ? `${c.ai_name} (AI)`
        : c.author?.display_name || c.author?.username || "someone";
      return `${name}: ${c.body}`;
    })
    .join("\n");
}

async function generate(p: any, mealDesc: string, thread: string): Promise<string> {
  const convo = thread
    ? `\n\nConversation so far:\n${thread}`
    : "\n\nNo comments yet.";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 1.0,
      max_tokens: 140,
      messages: [
        { role: "system", content: GUARDRAILS },
        { role: "system", content: `PERSONA (${p.ai_name}): ${p.ai_prompt}` },
        { role: "user", content: `Your friend's meal: ${mealDesc}${convo}\n\nAdd your comment as ${p.ai_name}.` },
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
