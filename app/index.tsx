import React from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/theme";

/** Entry gate: route to auth, onboarding, or the app. */
export default function Index() {
  const { session, profile, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
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

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  // Signed in but no username yet → finish setup.
  if (!profile?.username) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
