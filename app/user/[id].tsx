import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { format, isToday, isYesterday } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { getProfile, getUserWall, getDailyTotals, WallItem } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { MacroChips } from "@/components/MacroChips";
import { PressableScale } from "@/components/PressableScale";
import { EmptyState } from "@/components/misc";
import { useTheme, spacing, radius, brand, shadow } from "@/theme";
import { useI18n } from "@/i18n";
import type { Profile, CommentWithAuthor } from "@/types/database";

export default function UserWall() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useI18n();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<WallItem[]>([]);
  const [todayCal, setTodayCal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id || !user) return;
    const [p, w, totals] = await Promise.all([
      getProfile(id),
      getUserWall(id, user.id),
      getDailyTotals(id, new Date()),
    ]);
    setProfile(p);
    setItems(w);
    setTodayCal(totals.calories);
    setLoading(false);
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const name = profile?.display_name || profile?.username || "User";
  const isMe = id === user?.id;

  // group meals by day label
  const groups: { label: string; items: WallItem[] }[] = [];
  for (const it of items) {
    const d = new Date(it.logged_at);
    const label = isToday(d)
      ? t("track.today")
      : isYesterday(d)
      ? "Yesterday"
      : format(d, "EEEE, MMM d");
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(it);
    else groups.push({ label, items: [it] });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* hero header */}
        <LinearGradient
          colors={[brand.blue, brand.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 8 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </Pressable>
          <Avatar uri={profile?.avatar_url} name={name} size={84} />
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroUser}>@{profile?.username}</Text>
          <View style={styles.statRow}>
            <Stat value={String(profile?.streak_count ?? 0)} label={t("profile.dayStreak")} />
            <View style={styles.statDivider} />
            <Stat value={todayCal.toLocaleString()} label={t("track.today")} />
            <View style={styles.statDivider} />
            <Stat value={String(profile?.daily_calorie_goal ?? 0)} label={t("profile.dailyGoal")} />
          </View>
        </LinearGradient>

        {/* timeline */}
        {items.length === 0 ? (
          <EmptyState
            icon="restaurant-outline"
            title={t("track.empty.title")}
            subtitle={isMe ? t("track.empty.sub") : ""}
          />
        ) : (
          <View style={styles.timeline}>
            {groups.map((g) => (
              <View key={g.label}>
                <Text style={[styles.dayLabel, { color: colors.textMuted }]}>
                  {g.label.toUpperCase()}
                </Text>
                {g.items.map((it, i) => (
                  <TimelineEntry key={it.id} item={it} index={i} />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TimelineEntry({ item, index }: { item: WallItem; index: number }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 50)}
      style={styles.entry}
    >
      {/* rail */}
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: colors.primary, borderColor: colors.background }]} />
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>

      {/* content */}
      <View style={{ flex: 1 }}>
        <PressableScale onPress={() => router.push(`/log/${item.id}`)}>
          <View style={[styles.meal, { backgroundColor: colors.card, borderColor: colors.border }, shadow(1)]}>
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, { backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="fast-food" size={22} color={colors.textFaint} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.mealName, { color: colors.text }]} numberOfLines={1}>
                {item.meal_name}
              </Text>
              <Text style={[styles.mealMeta, { color: colors.textFaint }]}>
                {t(`meal.${item.meal_type}`)} · {format(new Date(item.logged_at), "h:mm a")}
              </Text>
              <View style={{ marginTop: 8 }}>
                <MacroChips
                  calories={item.calories}
                  protein={item.protein_g}
                  carbs={item.carbs_g}
                  fat={item.fat_g}
                  compact
                />
              </View>
            </View>
          </View>
        </PressableScale>

        {/* comments (AI personas + people) */}
        {item.comments.map((c) => (
          <CommentBubble key={c.id} comment={c} />
        ))}
      </View>
    </Animated.View>
  );
}

function CommentBubble({ comment }: { comment: CommentWithAuthor }) {
  const { colors } = useTheme();
  const isAI = comment.is_ai;
  const who = isAI
    ? comment.ai_name || "AI"
    : comment.author.display_name || comment.author.username;
  return (
    <View style={styles.commentRow}>
      {isAI ? (
        <View style={[styles.aiAvatar, { backgroundColor: brand.blue + "22" }]}>
          <Text style={{ fontSize: 15 }}>{comment.ai_emoji || "🤖"}</Text>
        </View>
      ) : (
        <Avatar uri={comment.author.avatar_url} name={who} size={26} />
      )}
      <View
        style={[
          styles.bubble,
          { backgroundColor: isAI ? brand.blue + "14" : colors.surfaceAlt },
        ]}
      >
        <Text style={[styles.bubbleName, { color: colors.text }]}>
          {who}
          {isAI && <Text style={{ color: brand.blue }}> · AI</Text>}
        </Text>
        <Text style={[styles.bubbleBody, { color: colors.text }]}>{comment.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: {
    alignItems: "center",
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  back: { position: "absolute", left: spacing.md, top: 8, padding: 8 },
  heroName: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 12 },
  heroUser: { color: "#fff", opacity: 0.9, fontSize: 14, marginTop: 2 },
  statRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.lg, gap: spacing.lg },
  stat: { alignItems: "center" },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  statLabel: { color: "#fff", opacity: 0.85, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.3)" },
  timeline: { padding: spacing.lg },
  dayLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 28,
  },
  entry: { flexDirection: "row", gap: spacing.md },
  rail: { width: 12, alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 6 },
  line: { width: 2, flex: 1, marginTop: 2 },
  meal: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  thumb: { width: 60, height: 60, borderRadius: radius.sm },
  mealName: { fontSize: 15, fontWeight: "700" },
  mealMeta: { fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  commentRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.sm,
    marginLeft: spacing.md,
    marginBottom: 2,
  },
  aiAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md },
  bubbleName: { fontSize: 12, fontWeight: "700" },
  bubbleBody: { fontSize: 14, marginTop: 2, lineHeight: 19 },
  entryLast: {},
});
