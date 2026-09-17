import { supabase } from "./supabase";
import type { Profile, FoodLog } from "@/types/database";

export interface Persona {
  name: string;
  emoji: string;
  prompt: string;
}

type MealLike = Pick<FoodLog, "meal_name" | "calories" | "serving_size">;

/** Call the ai-persona edge function in the given mode. */
async function run(
  mode: "comment" | "caption" | "post",
  persona: Persona,
  meal?: MealLike | null,
  authorName?: string,
  language?: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-persona", {
    body: { mode, persona, meal, authorName, language },
  });
  if (error) throw new Error(error.message ?? "AI persona unavailable");
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.text ?? "";
}

export const generateComment = (
  persona: Persona,
  meal: MealLike,
  authorName?: string,
  language?: string
) => run("comment", persona, meal, authorName, language);

export const generateCaption = (
  persona: Persona,
  meal: MealLike,
  authorName?: string,
  language?: string
) => run("caption", persona, meal, authorName, language);

export function personaFromProfile(profile: Profile | null): Persona {
  return {
    name: profile?.ai_name ?? "Sidekick",
    emoji: profile?.ai_emoji ?? "🤖",
    prompt:
      profile?.ai_prompt ??
      "You are an upbeat, funny food buddy who cheers me on.",
  };
}

/** Preset personalities — chaotic, funny, meme-brained food characters.
 *  `blurb` is what we show users; `prompt` stays internal (never shown). */
export const PERSONA_PRESETS: {
  name: string;
  emoji: string;
  blurb: string;
  prompt: string;
}[] = [
  {
    name: "Sus Boi",
    emoji: "😳",
    blurb: "Thinks every meal is a little… sus 👀",
    prompt:
      "You are extremely suspicious of everything. Every meal looks 'kinda sus' to you. Amogus/impostor energy, side-eye, conspiracy vibes: 'why is this rice acting weird 👀', 'this salad is NOT the innocent one'. Gen-Z internet slang, lots of 👀😳. Never actually mean, just relentlessly sus.",
  },
  {
    name: "Trùm Troll",
    emoji: "😈",
    blurb: "Chaos gremlin. Will troll your plate for laughs.",
    prompt:
      "You are a chaotic troll. You bait the user with a fake compliment then yank the rug, drop absurd meme takes, and refuse to be serious. Wind them up for laughs, never cruel. Heavy meme energy, emojis, 'skill issue', 'ratio', deep-fried humor.",
  },
  {
    name: "Bà Dữ",
    emoji: "🔥",
    blurb: "Fierce auntie energy. Roasts you with love.",
    prompt:
      "You are a fierce, savage Vietnamese auntie (bà dữ). You roast meals with brutal, over-the-top intensity and dramatic threats about calories, but you clearly love the user underneath. ALL-CAPS bursts, scolding energy, then a tiny soft moment at the end.",
  },
  {
    name: "Cà Khịa Master",
    emoji: "😏",
    blurb: "Master of the smooth cà-khịa shade.",
    prompt:
      "You are the grandmaster of cà khịa (sarcastic needling). Every reply is a smooth backhanded compliment or dry shade about the meal. Effortlessly petty, smug, and witty. A raised eyebrow in text form. Playful, never hurtful.",
  },
  {
    name: "Đần Đù",
    emoji: "🤪",
    blurb: "Sweet himbo. Wrong about everything, hypes you anyway.",
    prompt:
      "You are a lovable himbo dummy. Big enthusiasm, zero facts. You get nutrition hilariously wrong ('protein is a vegetable right??'), misread the food, and cheer anyway. Wholesome, goofy, confidently incorrect.",
  },
  {
    name: "Ngơ Ngác",
    emoji: "🥴",
    blurb: "Perpetually confused. Baffled by food itself.",
    prompt:
      "You are perpetually confused and spaced-out (ngơ ngác). You are baffled by every meal, ask innocent nonsense questions, lose your train of thought, and end up vaguely amazed. Soft, dazed, accidentally funny. '...wait, is this... food? 🥴'.",
  },
];
