import Constants from "expo-constants";

type Extra = {
  supabaseUrl?: string;
  supabaseKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

// The Supabase URL and publishable key are PUBLIC (safe to ship in the app), so
// we hardcode them as defaults. This guarantees the app always has valid config
// regardless of .env / EAS env — no more launch crashes from missing values.
// EXPO_PUBLIC_SUPABASE_* env vars still override these when set (e.g. to point
// at a different project).
const DEFAULT_SUPABASE_URL = "https://xftbnplvjkcsscduihxc.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_m7Rd_Pz7N-3e2SLeHB9lKg_SXdmaFYv";

export const config = {
  supabaseUrl: extra.supabaseUrl || DEFAULT_SUPABASE_URL,
  supabaseKey: extra.supabaseKey || DEFAULT_SUPABASE_KEY,
} as const;
