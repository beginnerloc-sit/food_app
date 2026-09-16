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
  toggleLike,
} from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { MacroChips } from "@/components/MacroChips";
import { LikeButton } from "@/components/LikeButton";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, radius, brand } from "@/theme";
import type { FoodLogWithAuthor, CommentWithAuthor } from "@/types/database";

export default function LogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [log, setLog] = useState<FoodLogWithAuthor | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

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
        <Text style={{ color: colors.textMuted }}>Log not found.</Text>
      </View>
    );
  }

  const authorName = log.author.display_name || log.author.username;
  const isMe = log.user_id === user?.id;

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
        </View>

        <Animated.View entering={FadeInDown} style={styles.body}>
          <View style={styles.authorRow}>
            <Avatar uri={log.author.avatar_url} name={authorName} size={44} ring />
            <View style={{ flex: 1 }}>
              <Text style={[styles.author, { color: colors.text }]}>
                {isMe ? "You" : authorName}
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
              {log.serving_size} · {log.meal_type}
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
          <Text style={[styles.commentsTitle, { color: colors.text }]}>
            Comments {comments.length > 0 ? `(${comments.length})` : ""}
          </Text>
          {comments.length === 0 ? (
            <Text style={[styles.noComments, { color: colors.textFaint }]}>
              Be the first to comment.
            </Text>
          ) : (
            comments.map((c, i) => {
              const cn = c.author.display_name || c.author.username;
              return (
                <Animated.View
                  key={c.id}
                  entering={FadeInDown.delay(i * 40)}
                  style={styles.commentRow}
                >
                  <Avatar uri={c.author.avatar_url} name={cn} size={36} />
                  <View
                    style={[
                      styles.bubble,
                      { backgroundColor: colors.surfaceAlt },
                    ]}
                  >
                    <Text style={[styles.commentName, { color: colors.text }]}>
                      {cn}
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
          placeholder="Add a comment…"
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
  body: {
    padding: spacing.lg,
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "transparent",
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  author: { fontSize: 16, fontWeight: "700" },
  time: { fontSize: 12, marginTop: 2 },
  meal: { fontSize: 26, fontWeight: "800", marginTop: spacing.lg },
  serving: { fontSize: 14, marginTop: 4, textTransform: "capitalize" },
  notes: { fontSize: 14, marginTop: spacing.lg, lineHeight: 20 },
  commentsTitle: { fontSize: 17, fontWeight: "800", marginTop: spacing.xl },
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
