import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getFeed, getUnreadCount, toggleLike } from "@/lib/api";
import { LogCard } from "@/components/LogCard";
import { EmptyState, ScreenHeader } from "@/components/misc";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, brand } from "@/theme";
import { useI18n } from "@/i18n";
import type { FoodLogWithAuthor } from "@/types/database";

export default function Feed() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useI18n();
  const [logs, setLogs] = useState<FoodLogWithAuthor[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    const [f, u] = await Promise.all([getFeed(user.id), getUnreadCount(user.id)]);
    setLogs(f);
    setUnread(u);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  // Realtime: new posts + AI comments appear live.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("feed-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_logs" },
        () => loadFeed()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "log_comments" },
        () => loadFeed()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  const handleLike = async (log: FoodLogWithAuthor) => {
    if (!user) return;
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
      loadFeed();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* header */}
      <View style={{ paddingTop: insets.top + 12 }}>
        <ScreenHeader
          title="PlatePal"
          subtitle={t("tab.feed")}
          right={
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
          }
        />
      </View>

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
              title={t("feed.empty.title")}
              subtitle={t("feed.empty.sub")}
            />
          ) : null
        }
      />
    </View>
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
});
