import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/theme";
import { WELCOME_KEY } from "./welcome";

/** Entry gate: welcome carousel, then auth, onboarding, or the app. */
export default function Index() {
  const { session, profile, loading, profileLoaded } = useAuth();
  const { colors } = useTheme();
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_KEY)
      .then((v) => setWelcomeSeen(v === "1"))
      .catch(() => setWelcomeSeen(false));
  }, []);

  // Wait for the profile fetch to finish before deciding onboarding vs app,
  // otherwise a signed-in user briefly looks profile-less and gets bounced
  // to onboarding on every launch.
  const waitingForProfile = !!session && !profileLoaded;

  if (loading || welcomeSeen === null || waitingForProfile) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // First run on this device: show the welcome carousel.
  if (!welcomeSeen) return <Redirect href={"/welcome" as any} />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!profile?.username) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
