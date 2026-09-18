import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/lib/api";
import { generateComment, PERSONA_PRESETS } from "@/lib/persona";
import { Button } from "@/components/Button";
import { Card } from "@/components/misc";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, radius, brand } from "@/theme";
import { useI18n } from "@/i18n";

const EMOJI_CHOICES = ["🤖", "🔥", "💪", "🧘", "💅", "🍝", "👽", "🦖", "🐸", "👑", "🎃", "🥑"];

export default function AiPersona() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuth();
  const { t, lang } = useI18n();

  const [enabled, setEnabled] = useState(profile?.ai_enabled ?? false);
  const [autoComment, setAutoComment] = useState(profile?.ai_autocomment ?? true);
  const [name, setName] = useState(profile?.ai_name ?? "Sidekick");
  const [emoji, setEmoji] = useState(profile?.ai_emoji ?? "🤖");
  const [prompt, setPrompt] = useState(profile?.ai_prompt ?? "");
  const [custom, setCustom] = useState(
    !PERSONA_PRESETS.some((p) => p.prompt === profile?.ai_prompt)
  );
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const applyPreset = (p: (typeof PERSONA_PRESETS)[number]) => {
    setName(p.name);
    setEmoji(p.emoji);
    setPrompt(p.prompt);
    setCustom(false);
    setPreview(null);
  };

  const tryPreview = async () => {
    if (!prompt.trim()) {
      Alert.alert("Add a personality", "Describe your AI's vibe first.");
      return;
    }
    setPreviewing(true);
    setPreview(null);
    try {
      const text = await generateComment(
        { name, emoji, prompt },
        { meal_name: "avocado toast with a poached egg", calories: 340, serving_size: "1 slice" },
        profile?.display_name ?? profile?.username ?? "you",
        lang
      );
      setPreview(text);
    } catch (e: any) {
      setPreview(
        "Couldn't reach the AI. Make sure the ai-persona function is deployed with your OpenAI key."
      );
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    if (!user) return;
    if (enabled && !prompt.trim()) {
      Alert.alert("Add a personality", "Describe how your AI should behave.");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.id, {
        ai_enabled: enabled,
        ai_autocomment: autoComment,
        ai_name: name.trim() || "Sidekick",
        ai_emoji: emoji,
        ai_prompt: prompt.trim(),
      });
      await refreshProfile();
      router.back();
    } catch (e: any) {
      Alert.alert("Oops", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[brand.blue, brand.coral]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Ionicons name="chevron-down" size={26} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          <Text style={styles.headerTitle}>{name || "Your AI"}</Text>
          <Text style={styles.headerSub}>{t("persona.header")}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 340 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* enable */}
        <Card>
          <ToggleRow
            title={t("persona.enable")}
            subtitle={t("persona.enableSub")}
            value={enabled}
            onValueChange={setEnabled}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ToggleRow
            title={t("persona.auto")}
            subtitle={t("persona.autoSub")}
            value={autoComment}
            onValueChange={setAutoComment}
            disabled={!enabled}
          />
        </Card>

        {/* character presets */}
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t("persona.preset")}
        </Text>
        <View style={styles.presetGrid}>
          {PERSONA_PRESETS.map((p) => {
            const active = !custom && prompt === p.prompt;
            return (
              <PressableScale key={p.name} onPress={() => applyPreset(p)} style={styles.presetWrap}>
                <View
                  style={[
                    styles.preset,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceAlt,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 30 }}>{p.emoji}</Text>
                  <Text
                    style={[styles.presetName, { color: active ? "#fff" : colors.text }]}
                  >
                    {p.name}
                  </Text>
                  <Text
                    style={[
                      styles.presetBlurb,
                      { color: active ? "rgba(255,255,255,0.9)" : colors.textMuted },
                    ]}
                    numberOfLines={2}
                  >
                    {p.blurb}
                  </Text>
                </View>
              </PressableScale>
            );
          })}
          {/* custom */}
          <PressableScale onPress={() => setCustom(true)} style={styles.presetWrap}>
            <View
              style={[
                styles.preset,
                {
                  backgroundColor: custom ? colors.primary : colors.surfaceAlt,
                  borderColor: custom ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={{ fontSize: 30 }}>✍️</Text>
              <Text style={[styles.presetName, { color: custom ? "#fff" : colors.text }]}>
                {t("persona.custom")}
              </Text>
              <Text
                style={[
                  styles.presetBlurb,
                  { color: custom ? "rgba(255,255,255,0.9)" : colors.textMuted },
                ]}
                numberOfLines={2}
              >
                {t("persona.customBlurb")}
              </Text>
            </View>
          </PressableScale>
        </View>

        {/* name + emoji */}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t("persona.nameIcon")}</Text>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("persona.namePh")}
            placeholderTextColor={colors.textFaint}
            style={[
              styles.input,
              { flex: 1, backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
            ]}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginTop: 10 }}
        >
          {EMOJI_CHOICES.map((e) => (
            <Pressable key={e} onPress={() => setEmoji(e)}>
              <View
                style={[
                  styles.emojiBtn,
                  {
                    backgroundColor: emoji === e ? brand.coral + "22" : colors.surfaceAlt,
                    borderColor: emoji === e ? brand.coral : "transparent",
                  },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* personality: only editable in custom mode; presets stay hidden */}
        {custom ? (
          <>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {t("persona.personality")}
        </Text>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder={t("persona.personalityPh")}
          placeholderTextColor={colors.textFaint}
          multiline
          style={[
            styles.input,
            styles.promptInput,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
          ]}
        />
          </>
        ) : null}

        {/* preview */}
        <PressableScale onPress={tryPreview}>
          <View style={[styles.previewBtn, { borderColor: colors.primary }]}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={[styles.previewBtnText, { color: colors.primary }]}>
              {previewing ? `${t("persona.thinking")}…` : t("persona.preview")}
            </Text>
          </View>
        </PressableScale>

        {preview && (
          <Animated.View entering={FadeIn} style={{ marginTop: spacing.md }}>
            <View style={[styles.previewBubble, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={{ fontSize: 20 }}>{emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewName, { color: colors.text }]}>
                  {name} <Text style={{ color: brand.blue }}>· AI</Text>
                </Text>
                <Text style={[styles.previewText, { color: colors.text }]}>
                  {preview}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.saveBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Button label={t("persona.save")} onPress={save} loading={saving} />
      </View>
    </View>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.toggleRow, { opacity: disabled ? 0.5 : 1 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.toggleSub, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: brand.green }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerCenter: { alignItems: "center", marginTop: -8 },
  bigEmoji: { fontSize: 46 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 6 },
  headerSub: { color: "#fff", opacity: 0.9, fontSize: 13, marginTop: 2 },
  divider: { height: 1, marginVertical: spacing.sm },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  toggleTitle: { fontSize: 15, fontWeight: "700" },
  toggleSub: { fontSize: 12, marginTop: 2 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: spacing.xl,
  },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  presetWrap: { width: "31.5%" },
  preset: {
    alignItems: "center",
    gap: 5,
    paddingVertical: spacing.md,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 118,
    justifyContent: "center",
  },
  presetName: { fontSize: 13, fontWeight: "800", textAlign: "center" },
  presetBlurb: { fontSize: 10.5, textAlign: "center", lineHeight: 14 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: 15,
  },
  promptInput: { minHeight: 110, textAlignVertical: "top", lineHeight: 21 },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  previewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingVertical: 12,
    marginTop: spacing.lg,
  },
  previewBtnText: { fontSize: 15, fontWeight: "700" },
  previewBubble: {
    flexDirection: "row",
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  previewName: { fontSize: 13, fontWeight: "700" },
  previewText: { fontSize: 14, marginTop: 3, lineHeight: 20 },
  saveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
