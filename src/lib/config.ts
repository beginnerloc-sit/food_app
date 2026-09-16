import Constants from "expo-constants";

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  googleWebClientId?: string;
  googleIosClientId?: string;
  googleAndroidClientId?: string;
  mealPrepApiKey?: string;
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
  supabaseAnonKey: required(extra.supabaseAnonKey, "EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  google: {
    webClientId: extra.googleWebClientId ?? "",
    iosClientId: extra.googleIosClientId ?? "",
    androidClientId: extra.googleAndroidClientId ?? "",
  },
  mealPrepApiKey: extra.mealPrepApiKey ?? "",
} as const;
