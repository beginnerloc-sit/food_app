import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { config } from "./config";

// We keep the client untyped and rely on the hand-written row types in
// "@/types/database" at the call sites (via casts in src/lib/api.ts). A full
// generated Database type can be dropped in later via `supabase gen types`.
// config always provides real (hardcoded public) values, so no placeholders.
export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
