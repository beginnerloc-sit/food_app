import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { getDailyTotals, getMyLogsForDay } from "@/lib/api";
import { askCoach, ChatMessage, CoachContext } from "@/lib/coach";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, radius, brand } from "@/theme";
import { useI18n } from "@/i18n";

export default function Coach() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const scrollRef = useRef<ScrollView>(null);
  const PROMPTS = [t("coach.p1"), t("coach.p2"), t("coach.p3"), t("coach.p4"), t("coach.p5")];

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: t("coach.intro") },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [context, setContext] = useState<CoachContext>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [totals, logs] = await Promise.all([
        getDailyTotals(user.id, new Date()),
        getMyLogsForDay(user.id, new Date()),
      ]);
      setContext({
        goal: profile?.daily_calorie_goal ?? 2000,
        consumed: totals.calories,
        recentMeals: logs.slice(0, 5).map((l) => l.meal_name),
      });
    })();
  }, [user, profile?.daily_calorie_goal]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setTyping(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const reply = await askCoach(next.slice(-8), context, lang);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Oof, my kitchen's on fire 🔥 (couldn't reach the AI). Make sure the coach-chat function is deployed with your OpenAI key.",
        },
      ]);
    } finally {
      setTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* header */}
      <LinearGradient
        colors={[brand.green, brand.blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Ionicons name="chevron-down" size={26} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 20 }}>👨‍🍳</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>{t("coach.name")}</Text>
            <Text style={styles.headerSub}>
              {typing ? `${t("coach.typing")}…` : t("coach.subtitle")}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.chat}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, i) => (
            <Bubble key={i} message={m} />
          ))}
          {typing && <TypingBubble />}
        </ScrollView>

        {/* prompt chips */}
        {messages.length <= 1 && (
          <Animated.View entering={FadeInUp}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptRow}
            >
              {PROMPTS.map((p) => (
                <PressableScale key={p} onPress={() => send(p)}>
                  <View
                    style={[
                      styles.prompt,
                      { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.promptText, { color: colors.text }]}>
                      {p}
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* composer */}
        <View
          style={[
            styles.composer,
            {
              paddingBottom: insets.bottom + 8,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`${t("coach.message")}…`}
            placeholderTextColor={colors.textFaint}
            style={[
              styles.input,
              { backgroundColor: colors.surfaceAlt, color: colors.text },
            ]}
            onSubmitEditing={() => send(input)}
          />
          <PressableScale onPress={() => send(input)} disabled={!input.trim()}>
            <View
              style={[
                styles.sendBtn,
                { backgroundColor: input.trim() ? brand.green : colors.surfaceAlt },
              ]}
            >
              <Ionicons
                name="send"
                size={18}
                color={input.trim() ? "#fff" : colors.textFaint}
              />
            </View>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const { colors } = useTheme();
  const isUser = message.role === "user";
  return (
    <Animated.View
      entering={isUser ? FadeInUp : FadeInDown}
      style={[
        styles.bubbleWrap,
        { alignItems: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: brand.green, borderBottomRightRadius: 4 }
            : {
                backgroundColor: colors.surfaceAlt,
                borderBottomLeftRadius: 4,
              },
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isUser ? "#fff" : colors.text },
          ]}
        >
          {message.content}
        </Text>
      </View>
    </Animated.View>
  );
}

function TypingBubble() {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown} style={styles.bubbleWrap}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: colors.surfaceAlt, flexDirection: "row", gap: 5 },
        ]}
      >
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </View>
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const { colors } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(withTiming(-4, { duration: 400 }), -1, true)
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View
      style={[
        { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.textFaint },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  close: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "#fff", opacity: 0.9, fontSize: 12 },
  chat: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  bubbleWrap: { width: "100%" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  promptRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  prompt: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  promptText: { fontSize: 13, fontWeight: "600" },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.pill,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
