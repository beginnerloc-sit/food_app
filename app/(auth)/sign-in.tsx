import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/Button";
import { useTheme, brand, radius, spacing } from "@/theme";
import { useI18n } from "@/i18n";
import { router } from "expo-router";

export default function SignIn() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // If email confirmation is on, there's no session yet.
        if (!data.session) {
          Alert.alert(
            "Confirm your email",
            "We sent a confirmation link. Confirm it, then sign in.",
            [{ text: "OK", onPress: () => setMode("signin") }]
          );
          return;
        }
        // Onboarding picks a username; the index gate routes there.
        router.replace("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/");
      }
    } catch (e: any) {
      Alert.alert("Oops", e.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* branded gradient header */}
      <LinearGradient
        colors={[brand.coral, brand.yellow]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 40 }]}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Ionicons name="restaurant" size={30} color={brand.coral} />
          </View>
          <Text style={styles.logo}>PlatePal</Text>
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(150)} style={styles.tagline}>
          {t("auth.tagline")}
        </Animated.Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.delay(250)}>
            <Text style={[styles.heading, { color: colors.text }]}>
              {mode === "signin" ? t("auth.welcome") : t("auth.create")}
            </Text>

            <Field
              icon="mail-outline"
              placeholder={t("auth.email")}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              icon="lock-closed-outline"
              placeholder={t("auth.password")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              label={mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
              onPress={submit}
              loading={loading}
              style={{ marginTop: spacing.md }}
            />

            <Text
              onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
              style={[styles.switch, { color: colors.primary }]}
            >
              {mode === "signin" ? t("auth.toSignUp") : t("auth.toSignIn")}
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & {
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const { icon, ...rest } = props;
  return (
    <View
      style={[
        styles.field,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.textMuted} />
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, { color: colors.text }]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: "#fff", marginTop: 14, opacity: 0.95 },
  form: { padding: spacing.xl, paddingTop: spacing.xxl },
  heading: { fontSize: 26, fontWeight: "800", marginBottom: spacing.xl },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  input: { flex: 1, paddingVertical: 15, fontSize: 16 },
  switch: {
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: 15,
    fontWeight: "600",
  },
});
