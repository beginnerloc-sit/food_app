import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Pressable,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  getFeed,
  getUnreadCount,
  toggleLike,
} from "@/lib/api";
import { fetchMealPrepArticles, DIET_FILTERS, dietQuery } from "@/lib/mealPrepApi";
import { LogCard } from "@/components/LogCard";
import { ArticleCard } from "@/components/ArticleCard";
import { Chip } from "@/components/Chip";
import { EmptyState } from "@/components/misc";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, brand, radius } from "@/theme";
import type { FoodLogWithAuthor } from "@/types/database";
import type { MealPrepArticle } from "@/types/meal";

type Tab = "friends" | "discover";

export default function Feed() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("friends");
  const [logs, setLogs] = useState<FoodLogWithAuthor[]>([]);
  const [articles, setArticles] = useState<MealPrepArticle[]>([]);
  const [diet, setDiet] = useState<string>("All");
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    const [f, u] = await Promise.all([
      getFeed(user.id),
      getUnreadCount(user.id),
    ]);
    setLogs(f);
    setUnread(u);
    setLoading(false);
  }, [user]);

  const loadArticles = useCallback(
    async (filter: string) => {
      const { query, diet: d } = dietQuery(filter);
      const a = await fetchMealPrepArticles(query, d);
      setArticles(a);
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  useEffect(() => {
    loadArticles(diet);
  }, [diet, loadArticles]);

  // Realtime: new logs from friends appear live.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("feed-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "food_logs" },
        () => loadFeed()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFeed(), loadArticles(diet)]);
    setRefreshing(false);
  };

  const handleLike = async (log: FoodLogWithAuthor) => {
    if (!user) return;
    // optimistic update
    setLogs((prev) =>
      prev.map((l) =>
        l.id === log.id
          ? {
              ...l,
              liked_by_me: !l.liked_by_me,
              like_count: l.like_count + (l.liked_by_me ? -1 : 1),
            }
          : l
      )
    );
    try {
      await toggleLike(log.id, user.id, log.liked_by_me);
    } catch {
      loadFeed(); // revert on error
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.logoRow}>
          <View style={[styles.logoBadge, { backgroundColor: brand.coral }]}>
            <Ionicons name="restaurant" size={18} color="#fff" />
          </View>
          <Text style={[styles.logo, { color: colors.text }]}>PlatePal</Text>
        </View>
        <PressableScale onPress={() => router.push("/(tabs)/notifications")}>
          <View style={[styles.bell, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {unread > 0 && (
              <Animated.View
                entering={FadeIn}
                style={[styles.badge, { backgroundColor: colors.danger }]}
              >
                <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
              </Animated.View>
            )}
          </View>
        </PressableScale>
      </View>

      {/* segmented tabs */}
      <View style={styles.segment}>
        <SegBtn
          label="Friends"
          icon="people"
          active={tab === "friends"}
          onPress={() => setTab("friends")}
        />
        <SegBtn
          label="Discover"
          icon="compass"
          active={tab === "discover"}
          onPress={() => setTab("discover")}
        />
      </View>

      {tab === "friends" ? (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <LogCard
              log={item}
              index={index}
              isMe={item.user_id === user?.id}
              onToggleLike={() => handleLike(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="camera-outline"
                title="Your feed is empty"
                subtitle="Snap your first meal with the camera button, or add friends to see their meals here."
              />
            ) : null
          }
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {DIET_FILTERS.map((f) => (
                <Chip
                  key={f}
                  label={f}
                  active={diet === f}
                  color={brand.green}
                  onPress={() => setDiet(f)}
                />
              ))}
            </ScrollView>
          }
          renderItem={({ item, index }) => (
            <ArticleCard article={item} index={index} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <EmptyState
              icon="fast-food-outline"
              title="No articles yet"
              subtitle="Add a Spoonacular API key to load fresh meal-prep ideas."
            />
          }
        />
      )}
    </View>
  );
}

function SegBtn({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segBtn,
        { backgroundColor: active ? colors.primary : "transparent" },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? "#fff" : colors.textMuted}
      />
      <Text
        style={[styles.segText, { color: active ? "#fff" : colors.textMuted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  segment: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: "#8881",
    gap: 4,
  },
  segBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  segText: { fontSize: 14, fontWeight: "700" },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
