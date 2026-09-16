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

const EMOJI_CHOICES = ["🤖", "🔥", "💪", "🧘", "💅", "🍝", "👽", "🦖", "🐸", "👑", "🎃", "🥑"];

export default function AiPersona() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile } = useAuth();

  const [enabled, setEnabled] = useState(profile?.ai_enabled ?? false);
  const [autoComment, setAutoComment] = useState(profile?.ai_autocomment ?? true);
  const [name, setName] = useState(profile?.ai_name ?? "Sidekick");
  const [emoji, setEmoji] = useState(profile?.ai_emoji ?? "🤖");
  const [prompt, setPrompt] = useState(profile?.ai_prompt ?? "");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const applyPreset = (p: (typeof PERSONA_PRESETS)[number]) => {
    setName(p.name);
    setEmoji(p.emoji);
    setPrompt(p.prompt);
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
        profile?.display_name ?? profile?.username ?? "you"
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
          <Text style={styles.headerSub}>Design your own AI character</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        {/* enable */}
        <Card>
          <ToggleRow
            title="Enable my AI"
            subtitle="Let your AI join the feed"
            value={enabled}
            onValueChange={setEnabled}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ToggleRow
            title="Auto-comment on my meals"
            subtitle="Reacts to every meal you post"
            value={autoComment}
            onValueChange={setAutoComment}
            disabled={!enabled}
          />
        </Card>

        {/* presets */}
        <Text style={[styles.label, { color: colors.textMuted }]}>
          Start from a preset
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: spacing.lg }}
        >
          {PERSONA_PRESETS.map((p) => (
            <PressableScale key={p.name} onPress={() => applyPreset(p)}>
              <View
                style={[
                  styles.preset,
                  {
                    backgroundColor:
                      name === p.name ? colors.primary : colors.surfaceAlt,
                    borderColor: name === p.name ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
                <Text
                  style={[
                    styles.presetName,
                    { color: name === p.name ? "#fff" : colors.text },
                  ]}
                >
                  {p.name}
                </Text>
              </View>
            </PressableScale>
          ))}
        </ScrollView>

        {/* name + emoji */}
        <Text style={[styles.label, { color: colors.textMuted }]}>Name & icon</Text>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="AI name"
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

        {/* prompt */}
        <Text style={[styles.label, { color: colors.textMuted }]}>
          Personality (prompt)
        </Text>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Describe how your AI talks and behaves… e.g. 'A dramatic French chef who is obsessed with butter and roasts my bland meals.'"
          placeholderTextColor={colors.textFaint}
          multiline
          style={[
            styles.input,
            styles.promptInput,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
          ]}
        />

        {/* preview */}
        <PressableScale onPress={tryPreview}>
          <View style={[styles.previewBtn, { borderColor: colors.primary }]}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={[styles.previewBtnText, { color: colors.primary }]}>
              {previewing ? "Thinking…" : "Preview a comment"}
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
        <Button label="Save persona" onPress={save} loading={saving} />
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
  preset: {
    alignItems: "center",
    gap: 6,
    width: 92,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  presetName: { fontSize: 12, fontWeight: "700", textAlign: "center" },
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
