import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatDistanceToNow } from "date-fns";
import { router } from "expo-router";
import { Avatar } from "./Avatar";
import { MacroChips } from "./MacroChips";
import { LikeButton } from "./LikeButton";
import { PressableScale } from "./PressableScale";
import { useTheme, radius, spacing, shadow, brand } from "@/theme";
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

const CONFIDENCE_COLOR = (c: number | null) =>
  c == null ? brand.blue : c >= 0.75 ? brand.green : c >= 0.5 ? brand.yellow : brand.coral;

/** A single meal post in the social feed. */
export function LogCard({ log, index = 0, isMe, onToggleLike }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const name = log.author.display_name || log.author.username;

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 60).springify().damping(16)}
    >
      <PressableScale
        onPress={() => router.push(`/log/${log.id}`)}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          shadow(1),
        ]}
      >
        {/* header */}
        <View style={styles.header}>
          <Avatar uri={log.author.avatar_url} name={name} size={40} ring />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              {isMe ? t("common.you") : name}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons
                name={MEAL_ICON[log.meal_type]}
                size={12}
                color={colors.textFaint}
              />
              <Text style={[styles.meta, { color: colors.textFaint }]}>
                {t(`meal.${log.meal_type}`)} ·{" "}
                {formatDistanceToNow(new Date(log.logged_at), { addSuffix: true })}
              </Text>
            </View>
          </View>
          {log.ai_confidence != null && (
            <View
              style={[
                styles.aiBadge,
                { backgroundColor: CONFIDENCE_COLOR(log.ai_confidence) + "22" },
              ]}
            >
              <Ionicons
                name="sparkles"
                size={11}
                color={CONFIDENCE_COLOR(log.ai_confidence)}
              />
              <Text
                style={[
                  styles.aiText,
                  { color: CONFIDENCE_COLOR(log.ai_confidence) },
                ]}
              >
                AI
              </Text>
            </View>
          )}
        </View>

        {/* photo */}
        {log.photo_url ? (
          <Image
            source={{ uri: log.photo_url }}
            style={styles.photo}
            contentFit="cover"
            transition={250}
          />
        ) : null}

        {/* body */}
        <View style={styles.body}>
          <Text style={[styles.meal, { color: colors.text }]}>{log.meal_name}</Text>
          {log.serving_size ? (
            <Text style={[styles.serving, { color: colors.textMuted }]}>
              {log.serving_size}
            </Text>
          ) : null}
          <View style={{ marginTop: 10 }}>
            <MacroChips
              calories={log.calories}
              protein={log.protein_g}
              carbs={log.carbs_g}
              fat={log.fat_g}
            />
          </View>
        </View>

        {/* footer actions */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <LikeButton
            liked={log.liked_by_me}
            count={log.like_count}
            onToggle={onToggleLike}
          />
          <PressableScale
            style={styles.action}
            onPress={() => router.push(`/log/${log.id}`)}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
            {log.comment_count > 0 && (
              <Text style={[styles.count, { color: colors.textMuted }]}>
                {log.comment_count}
              </Text>
            )}
          </PressableScale>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  name: { fontSize: 15, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  meta: { fontSize: 12, textTransform: "capitalize" },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  aiText: { fontSize: 11, fontWeight: "800" },
  photo: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#0002" },
  body: { padding: spacing.md, paddingTop: spacing.md },
  meal: { fontSize: 18, fontWeight: "700" },
  serving: { fontSize: 13, marginTop: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { fontSize: 14, fontWeight: "600" },
});
