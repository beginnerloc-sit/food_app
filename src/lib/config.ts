import Constants from "expo-constants";

type Extra = {
  supabaseUrl?: string;
  supabaseKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function required(value: string | undefined, name: string): string {
  if (!value) {
    // Surface a clear message during development instead of a cryptic crash.
    console.warn(
      `[PlatePal] Missing config value "${name}". Did you copy .env.example → .env?`
    );
    return "";
  }
  return value;
}

export const config = {
  supabaseUrl: required(extra.supabaseUrl, "EXPO_PUBLIC_SUPABASE_URL"),
  supabaseKey: required(extra.supabaseKey, "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
} as const;
