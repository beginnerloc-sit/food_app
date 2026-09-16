// Supabase Edge Function: coach-chat
// A witty AI nutrition buddy. Cracks jokes about your meals and plan while
// still giving genuinely useful, encouraging advice.
//
// Deploy:  supabase functions deploy coach-chat
// Secret:  supabase secrets set OPENAI_API_KEY=sk-...

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are "Chef", the PlatePal AI coach. You are the user's
funny, warm, slightly cheeky food buddy. Your style:
- Crack light jokes and playful roasts about their meals and habits (never mean).
- Use tasteful emoji occasionally.
- Keep replies SHORT — 1 to 3 sentences, punchy.
- Always sneak in one genuinely useful, encouraging nutrition tip.
- Never shame the user or give medical/eating-disorder-adjacent advice. If asked
  for extreme dieting, gently steer toward balance and suggest a professional.
You will be given context about their day (calories, goal, recent meals). Use it
to make the jokes specific and the advice relevant.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    const contextLine = context
      ? `Today's context — goal: ${context.goal ?? "?"} cal, consumed: ${
          context.consumed ?? 0
        } cal, remaining: ${
          (context.goal ?? 0) - (context.consumed ?? 0)
        } cal. Recent meals: ${
          (context.recentMeals ?? []).join(", ") || "none yet"
        }.`
      : "No context provided.";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.9,
        max_tokens: 220,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: contextLine },
          ...(messages ?? []),
        ],
      }),
    });

    if (!res.ok) {
      return json({ error: "OpenAI request failed", detail: await res.text() }, 502);
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "…my mouth is full 🤐";
    return json({ reply }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
