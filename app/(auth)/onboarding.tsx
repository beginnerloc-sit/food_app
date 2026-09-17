import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";
import { useTheme, radius, spacing, brand } from "@/theme";
import { useI18n } from "@/i18n";
import { router } from "expo-router";

/** After sign-up: choose a username and daily calorie goal. */
export default function Onboarding() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [goal, setGoal] = useState("2000");
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    const uname = username.trim().toLowerCase().replace(/\s+/g, "_");
    if (uname.length < 3) {
      Alert.alert(t("onb.username"), t("onb.pickUsername"));
      return;
    }
    if (!user) {
      Alert.alert(
        "Not signed in",
        "Your session expired. Please sign in again.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }]
      );
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username: uname,
        display_name: displayName.trim() || uname,
        daily_calorie_goal: parseInt(goal, 10) || 2000,
      });
      if (error) throw error;
      await refreshProfile();
      router.replace("/(tabs)");
    } catch (e: any) {
      if (e.message?.includes("duplicate")) {
        Alert.alert("Taken", "That username is already in use.");
      } else {
        Alert.alert("Oops", e.message ?? "Could not save profile");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown}>
          <View style={[styles.iconBadge, { backgroundColor: brand.green + "22" }]}>
            <Ionicons name="person-add" size={30} color={brand.green} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("onb.title")}
          </Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {t("onb.sub")}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)} style={{ marginTop: spacing.xxl }}>
          <Label text={t("onb.username")} />
          <Input
            value={username}
            onChangeText={setUsername}
            placeholder={t("onb.usernamePh")}
            autoCapitalize="none"
          />
          <Label text={t("onb.displayName")} />
          <Input
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Hannah R."
          />
          <Label text={t("onb.goal")} />
          <Input
            value={goal}
            onChangeText={setGoal}
            placeholder="2000"
            keyboardType="number-pad"
          />
          <Button
            label={t("onb.start")}
            onPress={finish}
            loading={loading}
            style={{ marginTop: spacing.lg }}
          />
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.textMuted }]}>{text}</Text>;
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      style={[
        styles.input,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          color: colors.text,
        },
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 26, fontWeight: "800" },
  sub: { fontSize: 15, marginTop: 6 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
  },
});
