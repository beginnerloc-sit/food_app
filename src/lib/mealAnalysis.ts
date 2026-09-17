import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";
import type { MealPrediction } from "@/types/meal";

/**
 * Send a local image to the analyze-meal edge function and get a prediction.
 * The image is resized/compressed first (a full-res camera photo is too large
 * for the vision API and causes failures), then read as base64 and posted.
 * The OpenAI key stays server-side.
 */
export async function analyzeMeal(localUri: string): Promise<MealPrediction> {
  // Downscale to max 1024px wide + JPEG compress -> small, reliable payload.
  const resized = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1024 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  const base64 =
    resized.base64 ??
    (await FileSystem.readAsStringAsync(resized.uri, {
      encoding: FileSystem.EncodingType.Base64,
    }));

  const { data, error } = await supabase.functions.invoke("analyze-meal", {
    body: { imageBase64: base64, mimeType: "image/jpeg" },
  });

  if (error) throw new Error(error.message ?? "Analysis failed");
  if (!data || (data as any).error) {
    throw new Error((data as any)?.error ?? "Analysis returned no result");
  }
  return normalize(data as MealPrediction);
}

/** Analyze from an already-hosted image URL (e.g. a Supabase Storage public link). */
export async function analyzeMealFromUrl(
  imageUrl: string
): Promise<MealPrediction> {
  const { data, error } = await supabase.functions.invoke("analyze-meal", {
    body: { imageUrl },
  });
  if (error) throw new Error(error.message ?? "Analysis failed");
  return normalize(data as MealPrediction);
}

function guessMime(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

function normalize(p: MealPrediction): MealPrediction {
  return {
    meal_name: p.meal_name ?? "Unknown meal",
    serving_size: p.serving_size ?? "1 serving",
    calories: Math.max(0, Math.round(p.calories ?? 0)),
    protein_g: Math.max(0, Math.round(p.protein_g ?? 0)),
    carbs_g: Math.max(0, Math.round(p.carbs_g ?? 0)),
    fat_g: Math.max(0, Math.round(p.fat_g ?? 0)),
    meal_type: p.meal_type ?? "snack",
    confidence: Math.min(1, Math.max(0, p.confidence ?? 0.5)),
    items: Array.isArray(p.items) ? p.items : [],
  };
}
