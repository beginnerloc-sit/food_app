import React from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { PressableScale } from "./PressableScale";
import { useTheme, radius, spacing, shadow, brand } from "@/theme";
import type { MealPrepArticle } from "@/types/meal";

interface Props {
  article: MealPrepArticle;
  index?: number;
}

/** Horizontal meal-prep article card for the news feed. */
export function ArticleCard({ article, index = 0 }: Props) {
  const { colors } = useTheme();

  const open = () => {
    if (article.sourceUrl) Linking.openURL(article.sourceUrl);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <PressableScale
        onPress={open}
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
          shadow(1),
        ]}
      >
        <Image source={{ uri: article.image }} style={styles.img} contentFit="cover" />
        <View style={styles.body}>
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: brand.green + "22" }]}>
              <Ionicons name="leaf" size={11} color={brand.green} />
              <Text style={[styles.tagText, { color: brand.green }]}>
                Meal Prep
              </Text>
            </View>
            {article.calories ? (
              <Text style={[styles.cal, { color: colors.textMuted }]}>
                {article.calories} cal
              </Text>
            ) : null}
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {article.title}
          </Text>
          <View style={styles.metaRow}>
            {article.readyInMinutes ? (
              <Meta icon="time-outline" text={`${article.readyInMinutes} min`} />
            ) : null}
            {article.servings ? (
              <Meta icon="people-outline" text={`${article.servings} servings`} />
            ) : null}
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function Meta({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={colors.textFaint} />
      <Text style={[styles.metaText, { color: colors.textFaint }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: radius.lg,
    borderWidth: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  img: { width: 110, height: 110, backgroundColor: "#0002" },
  body: { flex: 1, padding: spacing.md, justifyContent: "space-between" },
  tagRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagText: { fontSize: 11, fontWeight: "700" },
  cal: { fontSize: 12, fontWeight: "600" },
  title: { fontSize: 15, fontWeight: "700", marginTop: 6 },
  metaRow: { flexDirection: "row", gap: spacing.md, marginTop: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
});
