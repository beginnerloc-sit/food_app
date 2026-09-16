import { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Dynamic Expo config so we can pull public values from the environment.
 * Secrets (OpenAI key, Google client secret) must NOT live here — they belong
 * in Supabase Edge Function secrets. Only public/anon values go in `extra`.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "PlatePal",
  slug: "platepal",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "platepal",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#118AB2",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.beginnerloc.platepal",
    infoPlist: {
      NSCameraUsageDescription:
        "PlatePal uses your camera to snap photos of meals for calorie estimation.",
      NSPhotoLibraryUsageDescription:
        "PlatePal needs access to your photos to log meals from your library.",
    },
  },
  android: {
    package: "com.beginnerloc.platepal",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#118AB2",
    },
    permissions: ["CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"],
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-asset",
    "expo-font",
    [
      "expo-camera",
      {
        cameraPermission: "Allow PlatePal to access your camera to log meals.",
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission: "Allow PlatePal to access your photos to log meals.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#FF7F50",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    // New Supabase key system: publishable key (sb_publishable_...).
    // Falls back to the legacy anon key if that's what you have.
    supabaseKey:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
});
