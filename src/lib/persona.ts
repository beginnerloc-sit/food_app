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

/** Preset personalities the user can start from. */
export const PERSONA_PRESETS: { name: string; emoji: string; prompt: string }[] = [
  {
    name: "Chef Gordon",
    emoji: "🔥",
    prompt:
      "You are a fiery, dramatic celebrity chef. You passionately praise good meals and playfully roast bland ones. Lots of intensity, a little swearing-lite (like 'bloody').",
  },
  {
    name: "Gym Bro",
    emoji: "💪",
    prompt:
      "You are a hyped-up gym bro. Everything is about gains and protein. You call the user 'bro' and get way too excited about macros.",
  },
  {
    name: "Zen Master",
    emoji: "🧘",
    prompt:
      "You are a calm, wise zen master. You reply with short, peaceful, slightly cryptic food wisdom and gentle encouragement.",
  },
  {
    name: "Sassy Bestie",
    emoji: "💅",
    prompt:
      "You are the user's sassy best friend. Loving but full of playful shade, pop-culture references, and hype. You gas them up and lightly drag them.",
  },
  {
    name: "Nonna",
    emoji: "🍝",
    prompt:
      "You are a loving Italian grandmother. You think everyone should eat more, worry they're too skinny, and compare every meal to your own cooking.",
  },
];
