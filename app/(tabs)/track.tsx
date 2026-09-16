import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { format, addDays, isToday, isSameDay } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import {
  getMyLogsForDay,
  getDailyTotals,
  getWeeklyCalories,
  deleteLog,
  DailyTotals,
} from "@/lib/api";
import { CalorieRing } from "@/components/CalorieRing";
import { MacroBars } from "@/components/MacroBars";
import { WeeklyChart } from "@/components/WeeklyChart";
import { Card, SectionTitle, EmptyState } from "@/components/misc";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, brand, radius, macros, shadow } from "@/theme";
import { useI18n } from "@/i18n";
import type { FoodLog } from "@/types/database";

export default function Track() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const [date, setDate] = useState(new Date());
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [totals, setTotals] = useState<DailyTotals>({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    log_count: 0,
  });
  const [weekly, setWeekly] = useState<{ day: string; calories: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const goal = profile?.daily_calorie_goal ?? 2000;

  const load = useCallback(async () => {
    if (!user) return;
    const [l, t, w] = await Promise.all([
      getMyLogsForDay(user.id, date),
      getDailyTotals(user.id, date),
      getWeeklyCalories(user.id),
    ]);
    setLogs(l);
    setTotals(t);
    setWeekly(w);
  }, [user, date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmDelete = (log: FoodLog) => {
    Alert.alert("Delete log", `Remove "${log.meal_name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setLogs((prev) => prev.filter((l) => l.id !== log.id));
          await deleteLog(log.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* date navigator */}
        <View style={styles.dateNav}>
          <PressableScale onPress={() => setDate((d) => addDays(d, -1))}>
            <Ionicons name="chevron-back" size={24} color={colors.textMuted} />
          </PressableScale>
          <Text style={[styles.dateText, { color: colors.text }]}>
            {isToday(date) ? t("track.today") : format(date, "EEE, MMM d")}
          </Text>
          <PressableScale
            onPress={() => !isToday(date) && setDate((d) => addDays(d, 1))}
          >
            <Ionicons
              name="chevron-forward"
              size={24}
              color={isToday(date) ? colors.border : colors.textMuted}
            />
          </PressableScale>
        </View>

        {/* ring + macros */}
        <Animated.View entering={FadeInDown} style={styles.ringSection}>
          <CalorieRing consumed={totals.calories} goal={goal} />
          <View style={styles.ringActions}>
            {profile && profile.streak_count > 0 && (
              <View style={[styles.streak, { backgroundColor: brand.yellow + "22" }]}>
                <Ionicons name="flame" size={16} color={brand.coral} />
                <Text style={[styles.streakText, { color: colors.text }]}>
                  {t("track.streak", { n: profile.streak_count })}
                </Text>
              </View>
            )}
            <PressableScale onPress={() => router.push("/goals")}>
              <View style={[styles.streak, { backgroundColor: colors.surfaceAlt }]}>
                <Ionicons name="options-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.streakText, { color: colors.text }]}>
                  {t("track.setGoal")}
                </Text>
              </View>
            </PressableScale>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
          <Card>
            <MacroBars
              protein={{ value: totals.protein_g, goal: profile?.protein_goal_g ?? 140 }}
              carbs={{ value: totals.carbs_g, goal: profile?.carbs_goal_g ?? 220 }}
              fat={{ value: totals.fat_g, goal: profile?.fat_goal_g ?? 70 }}
            />
          </Card>
        </Animated.View>

        {/* weekly chart */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
          <Card>
            <SectionTitle title={t("track.week")} />
            <WeeklyChart data={weekly} goal={goal} />
          </Card>
        </Animated.View>

        {/* today's logs */}
        <View style={[styles.card, { marginTop: spacing.lg }]}>
          <SectionTitle
            title={isToday(date) ? t("track.todayMeals") : t("track.meals")}
            trailing={
              <Text style={{ color: colors.textMuted, fontWeight: "600" }}>
                {logs.length}
              </Text>
            }
          />
          {logs.length === 0 ? (
            <EmptyState
              icon="restaurant-outline"
              title={t("track.empty.title")}
              subtitle={t("track.empty.sub")}
            />
          ) : (
            logs.map((log, i) => (
              <Animated.View
                key={log.id}
                entering={FadeInDown.delay(i * 50)}
                layout={Layout.springify()}
              >
                <LogRow log={log} onDelete={() => confirmDelete(log)} />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      {/* floating Ask Chef button */}
      <View style={[styles.coachFab, { bottom: insets.bottom + 90 }, shadow(3)]}>
        <PressableScale onPress={() => router.push("/coach")}>
          <LinearGradient
            colors={[brand.green, brand.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coachFabInner}
          >
            <Text style={{ fontSize: 20 }}>👨‍🍳</Text>
            <Text style={styles.coachFabText}>{t("track.askChef")}</Text>
          </LinearGradient>
        </PressableScale>
      </View>
    </View>
  );
}

function LogRow({ log, onDelete }: { log: FoodLog; onDelete: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <PressableScale onLongPress={onDelete}>
      <View style={[styles.logRow, { borderColor: colors.border }]}>
        {log.photo_url ? (
          <Image source={{ uri: log.photo_url }} style={styles.logImg} />
        ) : (
          <View style={[styles.logImg, { backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" }]}>
            <Ionicons name="fast-food" size={22} color={colors.textFaint} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.logName, { color: colors.text }]} numberOfLines={1}>
            {log.meal_name}
          </Text>
          <Text style={[styles.logMeta, { color: colors.textFaint }]}>
            {t(`meal.${log.meal_type}`)} · {format(new Date(log.logged_at), "h:mm a")}
          </Text>
          <View style={styles.logMacros}>
            <Dot color={macros.protein} /><Tiny>{log.protein_g}p</Tiny>
            <Dot color={macros.carbs} /><Tiny>{log.carbs_g}c</Tiny>
            <Dot color={macros.fat} /><Tiny>{log.fat_g}f</Tiny>
          </View>
        </View>
        <Text style={[styles.logCal, { color: colors.primary }]}>
          {log.calories}
          <Text style={{ fontSize: 11, color: colors.textFaint }}> {t("common.cal")}</Text>
        </Text>
      </View>
    </PressableScale>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />;
}
function Tiny({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: 11, color: colors.textMuted, marginRight: 6 }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  dateText: { fontSize: 18, fontWeight: "800" },
  ringSection: { alignItems: "center", marginVertical: spacing.lg },
  ringActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  streakText: { fontSize: 14, fontWeight: "700" },
  coachFab: { position: "absolute", right: spacing.lg },
  coachFabInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  coachFabText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  card: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  logImg: { width: 52, height: 52, borderRadius: radius.md },
  logName: { fontSize: 15, fontWeight: "700" },
  logMeta: { fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  logMacros: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 5 },
  logCal: { fontSize: 18, fontWeight: "800" },
});
