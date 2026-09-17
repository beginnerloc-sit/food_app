import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

// We keep the client untyped and rely on the hand-written row types in
// "@/types/database" at the call sites (via casts in src/lib/api.ts). A full
// generated Database type can be dropped in later via `supabase gen types`.
//
// Fall back to placeholders if config is missing so createClient never throws
// at startup (that would crash the app on launch). Queries just fail until the
// real EXPO_PUBLIC_SUPABASE_* values are provided.
const url = config.supabaseUrl || "https://placeholder.supabase.co";
const key = config.supabaseKey || "public-anon-placeholder";

export const supabase = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
