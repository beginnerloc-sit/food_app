import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";

/**
 * Upload a meal photo (or avatar) to Supabase Storage (bucket: meal-photos)
 * and return its public URL.
 */
export async function uploadMealPhotoToSupabase(
  localUri: string,
  userId: string
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const path = `${userId}/${Date.now()}.jpg`;
  const bytes = decodeBase64(base64);

  const { error } = await supabase.storage
    .from("meal-photos")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from("meal-photos").getPublicUrl(path);
  return data.publicUrl;
}

// Minimal base64 → Uint8Array (avoids extra deps).
function decodeBase64(b64: string): Uint8Array {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  const len = b64.length;
  let bufferLength = (len * 3) / 4;
  if (b64[len - 1] === "=") bufferLength--;
  if (b64[len - 2] === "=") bufferLength--;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e1 = lookup[b64.charCodeAt(i)];
    const e2 = lookup[b64.charCodeAt(i + 1)];
    const e3 = lookup[b64.charCodeAt(i + 2)];
    const e4 = lookup[b64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bufferLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bufferLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}
