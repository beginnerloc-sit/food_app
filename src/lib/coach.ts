import { supabase } from "./supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CoachContext {
  goal?: number;
  consumed?: number;
  recentMeals?: string[];
}

/** Send the conversation + daily context to the coach-chat edge function. */
export async function askCoach(
  messages: ChatMessage[],
  context?: CoachContext,
  language?: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("coach-chat", {
    body: { messages, context, language },
  });
  if (error) throw new Error(error.message ?? "Coach is unavailable");
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.reply ?? "…";
}

/** Fun opener suggestions shown as tappable chips in the chat. */
export const COACH_PROMPTS = [
  "Roast my day so far 🔥",
  "What should I eat next?",
  "Is my meal plan any good?",
  "Give me a high-protein snack idea",
  "Hype me up!",
];
