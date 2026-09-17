import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { formatDistanceToNow, format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import {
  getLog,
  getComments,
  addComment,
  addAIComment,
  toggleLike,
  deleteLog,
} from "@/lib/api";
import { generateComment, personaFromProfile } from "@/lib/persona";
import { Avatar } from "@/components/Avatar";
import { MacroChips } from "@/components/MacroChips";
import { LikeButton } from "@/components/LikeButton";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, radius, brand } from "@/theme";
import { useI18n } from "@/i18n";
import type { FoodLogWithAuthor, CommentWithAuthor } from "@/types/database";

export default function LogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();

  const [log, setLog] = useState<FoodLogWithAuthor | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aiThinking, setAiThinking] = useState(false);

  const askAI = async () => {
    if (!user || !log || !profile) return;
    setAiThinking(true);
    try {
      const reply = await generateComment(
        personaFromProfile(profile),
        {
          meal_name: log.meal_name,
          calories: log.calories,
          serving_size: log.serving_size,
        },
        log.author.display_name || log.author.username,
        lang
      );
      if (reply) {
        await addAIComment(log.id, user.id, reply, profile.ai_name, profile.ai_emoji);
        const c = await getComments(log.id);
        setComments(c);
      }
    } catch {
      /* silent */
    } finally {
      setAiThinking(false);
    }
  };

  const load = useCallback(async () => {
    if (!id || !user) return;
    const [l, c] = await Promise.all([getLog(id, user.id), getComments(id)]);
    setLog(l);
    setComments(c);
    setLoading(false);
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleLike = async () => {
    if (!log || !user) return;
    setLog({
      ...log,
      liked_by_me: !log.liked_by_me,
      like_count: log.like_count + (log.liked_by_me ? -1 : 1),
    });
    await toggleLike(log.id, user.id, log.liked_by_me);
  };

  const send = async () => {
    if (!text.trim() || !user || !log) return;
    setSending(true);
    try {
      await addComment(log.id, user.id, text.trim());
      setText("");
      const c = await getComments(log.id);
      setComments(c);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!log) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>{t("log.notFound")}</Text>
      </View>
    );
  }

  const authorName = log.author.display_name || log.author.username;
  const isMe = log.user_id === user?.id;

  const confirmDelete = () => {
    Alert.alert(t("log.deleteTitle"), t("log.deleteMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteLog(log.id);
            router.back();
          } catch (e: any) {
            Alert.alert("Couldn't delete", e.message ?? "Try again.");
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* photo header */}
        <View>
          {log.photo_url ? (
            <Image source={{ uri: log.photo_url }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, { backgroundColor: colors.surfaceAlt }]} />
          )}
          <Pressable
            onPress={() => router.back()}
            style={[styles.back, { top: insets.top + 8 }]}
          >
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </Pressable>
          {isMe && (
            <View style={[styles.ownerActions, { top: insets.top + 8 }]}>
              <PressableScale onPress={() => router.push(`/edit-log/${log.id}` as any)}>
                <View style={styles.roundIcon}>
                  <Ionicons name="create-outline" size={20} color="#fff" />
                </View>
              </PressableScale>
              <PressableScale onPress={confirmDelete}>
                <View style={styles.roundIcon}>
                  <Ionicons name="trash-outline" size={19} color="#fff" />
                </View>
              </PressableScale>
            </View>
          )}
        </View>

        <Animated.View entering={FadeInDown} style={[styles.body, { backgroundColor: colors.background }]}>
          <View style={styles.authorRow}>
            <Avatar uri={log.author.avatar_url} name={authorName} size={44} ring />
            <View style={{ flex: 1 }}>
              <Text style={[styles.author, { color: colors.text }]}>
                {isMe ? t("common.you") : authorName}
              </Text>
              <Text style={[styles.time, { color: colors.textFaint }]}>
                {format(new Date(log.logged_at), "MMM d, h:mm a")}
              </Text>
            </View>
            <LikeButton
              liked={log.liked_by_me}
              count={log.like_count}
              onToggle={handleLike}
            />
          </View>

          <Text style={[styles.meal, { color: colors.text }]}>{log.meal_name}</Text>
          {log.serving_size ? (
            <Text style={[styles.serving, { color: colors.textMuted }]}>
              {log.serving_size} · {t(`meal.${log.meal_type}`)}
            </Text>
          ) : null}

          <View style={{ marginTop: spacing.lg }}>
            <MacroChips
              calories={log.calories}
              protein={log.protein_g}
              carbs={log.carbs_g}
              fat={log.fat_g}
            />
          </View>

          {log.notes ? (
            <Text style={[styles.notes, { color: colors.textMuted }]}>
              {log.notes}
            </Text>
          ) : null}

          {/* comments */}
          <View style={styles.commentsHeader}>
            <Text style={[styles.commentsTitle, { color: colors.text }]}>
              {t("log.comments")} {comments.length > 0 ? `(${comments.length})` : ""}
            </Text>
            {profile?.ai_enabled && (
              <PressableScale onPress={askAI} disabled={aiThinking}>
                <View style={[styles.aiTakeBtn, { backgroundColor: brand.blue + "18" }]}>
                  <Ionicons name="sparkles" size={13} color={brand.blue} />
                  <Text style={[styles.aiTakeText, { color: brand.blue }]}>
                    {aiThinking
                      ? `${t("persona.thinking")}…`
                      : t("persona.take", { emoji: profile.ai_emoji, name: profile.ai_name })}
                  </Text>
                </View>
              </PressableScale>
            )}
          </View>
          {comments.length === 0 ? (
            <Text style={[styles.noComments, { color: colors.textFaint }]}>
              {t("log.noComments")}
            </Text>
          ) : (
            comments.map((c, i) => {
              const ownerName = c.author.display_name || c.author.username;
              const cn = c.is_ai ? c.ai_name || "AI" : ownerName;
              const ownerIsMe = c.author.id === user?.id;
              return (
                <Animated.View
                  key={c.id}
                  entering={FadeInDown.delay(i * 40)}
                  style={styles.commentRow}
                >
                  {c.is_ai ? (
                    <View style={[styles.aiAvatar, { backgroundColor: brand.blue + "22" }]}>
                      <Text style={{ fontSize: 18 }}>{c.ai_emoji || "🤖"}</Text>
                    </View>
                  ) : (
                    <Avatar uri={c.author.avatar_url} name={cn} size={36} />
                  )}
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: c.is_ai
                          ? brand.blue + "14"
                          : colors.surfaceAlt,
                      },
                    ]}
                  >
                    <Text style={[styles.commentName, { color: colors.text }]}>
                      {cn}
                      {c.is_ai && (
                        <Text style={{ color: brand.blue, fontWeight: "700" }}>
                          {" · "}
                          {ownerIsMe ? "your AI" : `${ownerName}'s AI`}
                        </Text>
                      )}
                    </Text>
                    <Text style={[styles.commentBody, { color: colors.text }]}>
                      {c.body}
                    </Text>
                    <Text style={[styles.commentTime, { color: colors.textFaint }]}>
                      {formatDistanceToNow(new Date(c.created_at), {
                        addSuffix: true,
                      })}
                    </Text>
                  </View>
                </Animated.View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

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
          value={text}
          onChangeText={setText}
          placeholder={`${t("log.addComment")}…`}
          placeholderTextColor={colors.textFaint}
          style={[
            styles.composerInput,
            {
              backgroundColor: colors.surfaceAlt,
              color: colors.text,
            },
          ]}
        />
        <PressableScale onPress={send} disabled={sending || !text.trim()}>
          <View
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim() ? colors.primary : colors.surfaceAlt,
              },
            ]}
          >
            <Ionicons
              name="send"
              size={18}
              color={text.trim() ? "#fff" : colors.textFaint}
            />
          </View>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  photo: { width: "100%", height: 320, backgroundColor: "#0002" },
  back: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0007",
    alignItems: "center",
    justifyContent: "center",
  },
  ownerActions: { position: "absolute", right: 16, flexDirection: "row", gap: 8 },
  roundIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0007",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  author: { fontSize: 16, fontWeight: "700" },
  time: { fontSize: 12, marginTop: 2 },
  meal: { fontSize: 26, fontWeight: "800", marginTop: spacing.lg },
  serving: { fontSize: 14, marginTop: 4, textTransform: "capitalize" },
  notes: { fontSize: 14, marginTop: spacing.lg, lineHeight: 20 },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
  },
  commentsTitle: { fontSize: 17, fontWeight: "800" },
  aiTakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  aiTakeText: { fontSize: 12, fontWeight: "700" },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  noComments: { fontSize: 14, marginTop: spacing.md },
  commentRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  bubble: { flex: 1, padding: spacing.md, borderRadius: radius.md },
  commentName: { fontSize: 13, fontWeight: "700" },
  commentBody: { fontSize: 14, marginTop: 3, lineHeight: 19 },
  commentTime: { fontSize: 11, marginTop: 5 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  composerInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radius.pill,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
