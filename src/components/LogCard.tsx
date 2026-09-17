import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatDistanceToNow } from "date-fns";
import { router } from "expo-router";
import { Avatar } from "./Avatar";
import { MacroChips } from "./MacroChips";
import { LikeButton } from "./LikeButton";
import { PressableScale } from "./PressableScale";
import { useTheme, radius, spacing, shadow, absoluteFill } from "@/theme";
import { useI18n } from "@/i18n";
import type { FoodLogWithAuthor } from "@/types/database";

interface Props {
  log: FoodLogWithAuthor;
  index?: number;
  isMe: boolean;
  onToggleLike: () => void;
}

const MEAL_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: "cafe-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "nutrition-outline",
};

/** Editorial, photo-forward meal card. */
export function LogCard({ log, index = 0, isMe, onToggleLike }: Props) {
  const { colors, dark } = useTheme();
  const { t } = useI18n();
  const name = log.author.display_name || log.author.username;
  const hasPhoto = !!log.photo_url;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 70)
        .springify()
        .damping(16)}
    >
      <PressableScale
        onPress={() => router.push(`/log/${log.id}`)}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border, borderWidth: dark ? 1 : 0 },
          !dark && shadow(2),
        ]}
      >
        {/* media */}
        <View style={styles.media}>
          {hasPhoto ? (
            <Image source={{ uri: log.photo_url! }} style={styles.photo} contentFit="cover" transition={250} />
          ) : (
            <View style={[styles.photo, styles.noPhoto, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name={MEAL_ICON[log.meal_type]} size={44} color={colors.textFaint} />
            </View>
          )}

          {/* top scrim: author */}
          <LinearGradient
            colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]}
            style={styles.topScrim}
          >
            <PressableScale
              onPress={() => router.push(`/user/${log.user_id}`)}
              style={styles.authorTap}
            >
              <Avatar uri={log.author.avatar_url} name={name} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.author} numberOfLines={1}>
                  {isMe ? t("common.you") : name}
                </Text>
                <Text style={styles.time}>
                  {t(`meal.${log.meal_type}`)} ·{" "}
                  {formatDistanceToNow(new Date(log.logged_at), { addSuffix: true })}
                </Text>
              </View>
            </PressableScale>
            {log.ai_confidence != null && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={11} color="#fff" />
                <Text style={styles.aiText}>AI</Text>
              </View>
            )}
          </LinearGradient>

          {/* bottom scrim: meal name + calories */}
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]}
            style={styles.bottomScrim}
          >
            <Text style={styles.meal} numberOfLines={1}>
              {log.meal_name}
            </Text>
            <Text style={styles.kcal}>
              {log.calories} {t("common.cal")}
              {log.serving_size ? `  ·  ${log.serving_size}` : ""}
            </Text>
          </LinearGradient>
        </View>

        {/* macros */}
        <View style={styles.macrosRow}>
          <MacroChips
            calories={log.calories}
            protein={log.protein_g}
            carbs={log.carbs_g}
            fat={log.fat_g}
            compact
          />
        </View>

        {/* actions */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <LikeButton liked={log.liked_by_me} count={log.like_count} onToggle={onToggleLike} />
          <PressableScale style={styles.action} onPress={() => router.push(`/log/${log.id}`)}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
            {log.comment_count > 0 && (
              <Text style={[styles.count, { color: colors.textMuted }]}>
                {log.comment_count}
              </Text>
            )}
          </PressableScale>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  media: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#0002" },
  photo: { ...absoluteFill, width: "100%", height: "100%" },
  noPhoto: { alignItems: "center", justifyContent: "center" },
  topScrim: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  authorTap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  author: { color: "#fff", fontSize: 14, fontWeight: "700" },
  time: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 1, textTransform: "capitalize" },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  aiText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  bottomScrim: {
    ...absoluteFill,
    top: undefined,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    justifyContent: "flex-end",
  },
  meal: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  kcal: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600", marginTop: 2 },
  macrosRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { fontSize: 14, fontWeight: "600" },
});
