import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { getNotifications, markNotificationsRead } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { PressableScale } from "@/components/PressableScale";
import { EmptyState } from "@/components/misc";
import { useTheme, spacing, brand } from "@/theme";
import { useI18n } from "@/i18n";
import type { NotificationWithActor, NotificationType } from "@/types/database";

const ICON: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  new_log: { icon: "restaurant", color: brand.coral },
  like: { icon: "heart", color: "#EF476F" },
  comment: { icon: "chatbubble", color: brand.blue },
  friend_request: { icon: "person-add", color: brand.yellow },
  friend_accepted: { icon: "checkmark-circle", color: brand.green },
  added_to_circle: { icon: "notifications", color: brand.coral },
};

export default function Notifications() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<NotificationWithActor[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const n = await getNotifications(user.id);
    setItems(n);
    // mark read after showing
    markNotificationsRead(user.id);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <PressableScale onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.text }]}>{t("notif.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 40 }}
        renderItem={({ item, index }) => {
          const meta = ICON[item.type] ?? ICON.new_log;
          const actorName =
            item.actor?.display_name || item.actor?.username || "Someone";
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40)}>
              <PressableScale
                onPress={() => item.log_id && router.push(`/log/${item.log_id}`)}
              >
                <View
                  style={[
                    styles.row,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: item.read ? "transparent" : brand.coral + "0D",
                    },
                  ]}
                >
                  <View style={{ position: "relative" }}>
                    <Avatar uri={item.actor?.avatar_url} name={actorName} size={46} />
                    <View style={[styles.badge, { backgroundColor: meta.color }]}>
                      <Ionicons name={meta.icon} size={11} color="#fff" />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.body, { color: colors.text }]}>
                      <Text style={{ fontWeight: "700" }}>{actorName} </Text>
                      {stripName(item.body, actorName)}
                    </Text>
                    <Text style={[styles.time, { color: colors.textFaint }]}>
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                      })}
                    </Text>
                  </View>
                  {!item.read && (
                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </PressableScale>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title={t("notif.empty.title")}
            subtitle={t("notif.empty.sub")}
          />
        }
      />
    </View>
  );
}

// The DB stores the full sentence including the actor's name; strip the leading
// name so we can bold it ourselves.
function stripName(body: string, name: string): string {
  return body.startsWith(name) ? body.slice(name.length).trim() : body;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: "800" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  badge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  body: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 12, marginTop: 3 },
  dot: { width: 9, height: 9, borderRadius: 5 },
});
