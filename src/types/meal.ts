import type { MealType } from "./database";

/** Result returned by the analyze-meal edge function (OpenAI vision). */
export interface MealPrediction {
  meal_name: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  confidence: number; // 0..1
  items: string[]; // detected components, e.g. ["grilled chicken", "rice"]
}
