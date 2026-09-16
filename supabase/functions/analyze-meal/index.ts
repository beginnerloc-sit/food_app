// Supabase Edge Function: analyze-meal
// Receives a base64 image (or public image URL), asks OpenAI gpt-4o-mini to
// predict the meal name, serving size and macros, returns structured JSON.
//
// Deploy:  supabase functions deploy analyze-meal
// Secret:  supabase secrets set OPENAI_API_KEY=sk-...
//
// The mobile app calls this via supabase.functions.invoke("analyze-meal").
// The OpenAI key NEVER leaves the server.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are a nutrition estimation assistant for a food-logging app.
Look at the meal photo and estimate its nutrition. Be realistic for a single
serving as shown. If unsure, give your best estimate and lower the confidence.
Respond ONLY with the JSON object requested — no prose.`;

const jsonSchema = {
  name: "meal_prediction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      meal_name: { type: "string" },
      serving_size: { type: "string" },
      calories: { type: "integer" },
      protein_g: { type: "integer" },
      carbs_g: { type: "integer" },
      fat_g: { type: "integer" },
      meal_type: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner", "snack"],
      },
      confidence: { type: "number" },
      items: { type: "array", items: { type: "string" } },
    },
    required: [
      "meal_name",
      "serving_size",
      "calories",
      "protein_g",
      "carbs_g",
      "fat_g",
      "meal_type",
      "confidence",
      "items",
    ],
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl, mimeType } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return json({ error: "Provide imageBase64 or imageUrl" }, 400);
    }

    const imageContent = imageUrl
      ? { type: "image_url", image_url: { url: imageUrl } }
      : {
          type: "image_url",
          image_url: {
            url: `data:${mimeType ?? "image/jpeg"};base64,${imageBase64}`,
            detail: "low",
          },
        };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this meal and return the JSON prediction.",
              },
              imageContent,
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: jsonSchema },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "OpenAI request failed", detail }, 502);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return json({ error: "Empty response from model" }, 502);

    const prediction = JSON.parse(content);
    return json(prediction, 200);
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
