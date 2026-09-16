// Supabase Edge Function: ai-persona
// Runs the user's OWN custom AI persona (defined by their prompt) to either:
//   - "comment": react to a meal post in character
//   - "caption": write a short caption/post text for a meal
//   - "post":    write a standalone status post in character
//
// Deploy:  supabase functions deploy ai-persona
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

const GUARDRAILS = `You are an AI character inside a social food-tracking app.
Stay fully in the personality described by the user's persona prompt below.
Rules that always win over the persona:
- Keep it SHORT: 1 to 2 sentences, like a social media comment.
- Be playful, never cruel, never body-shaming, no medical/eating-disorder advice.
- You may use 0-2 emoji if it fits the character.
- Output ONLY the comment text — no quotes, no name prefix.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode, persona, meal, authorName } = await req.json();

    const personaPrompt = (persona?.prompt ?? "").toString().slice(0, 1500);
    const personaName = persona?.name ?? "Sidekick";

    let task = "";
    if (mode === "caption") {
      task = `Write a fun first-person caption for ${authorName ?? "the user"}'s meal: ${describeMeal(
        meal
      )}. Make it sound like they posted it.`;
    } else if (mode === "post") {
      task = `Write a short, in-character status post for the feed about food, cravings, or motivation. Standalone, no meal attached.`;
    } else {
      // default: comment on a post
      task = `React to this meal ${authorName ? `by ${authorName}` : ""}: ${describeMeal(
        meal
      )}. Leave a comment as ${personaName}.`;
    }

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
          { role: "system", content: `PERSONA (${personaName}): ${personaPrompt}` },
          { role: "user", content: task },
        ],
      }),
    });

    if (!res.ok) {
      return json({ error: "OpenAI request failed", detail: await res.text() }, 502);
    }
    const data = await res.json();
    let text = (data.choices?.[0]?.message?.content ?? "").trim();
    text = text.replace(/^["']|["']$/g, ""); // strip stray wrapping quotes
    return json({ text }, 200);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function describeMeal(meal: any): string {
  if (!meal) return "a mystery meal";
  const parts = [meal.meal_name];
  if (meal.calories) parts.push(`${meal.calories} cal`);
  if (meal.serving_size) parts.push(meal.serving_size);
  return parts.filter(Boolean).join(", ");
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
