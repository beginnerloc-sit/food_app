import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/lib/api";
import {
  computeGoals,
  GoalType,
  ActivityLevel,
  Sex,
  GOAL_LABELS,
  ACTIVITY_LABELS,
} from "@/lib/goals";
import { Button } from "@/components/Button";
import { Card } from "@/components/misc";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, radius, brand, macros } from "@/theme";

const GOAL_ICON: Record<GoalType, keyof typeof Ionicons.glyphMap> = {
  lose: "trending-down",
  maintain: "remove",
  gain: "trending-up",
};

export default function Goals() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();

  const [goalType, setGoalType] = useState<GoalType>("lose");
  const [sex, setSex] = useState<Sex>("female");
  const [age, setAge] = useState("28");
  const [weight, setWeight] = useState("70");
  const [height, setHeight] = useState("170");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [saving, setSaving] = useState(false);

  const result = useMemo(
    () =>
      computeGoals({
        sex,
        age: parseInt(age, 10) || 25,
        weightKg: parseFloat(weight) || 70,
        heightCm: parseFloat(height) || 170,
        activity,
        goalType,
      }),
    [sex, age, weight, height, activity, goalType]
  );

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        daily_calorie_goal: result.calories,
        protein_goal_g: result.protein_g,
        carbs_goal_g: result.carbs_g,
        fat_goal_g: result.fat_g,
      });
      await refreshProfile();
      router.back();
    } catch (e: any) {
      Alert.alert("Oops", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <PressableScale onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.text }]}>Set your goal</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        {/* goal type */}
        <Text style={[styles.label, { color: colors.textMuted }]}>I want to</Text>
        <View style={styles.goalRow}>
          {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
            <PressableScale key={g} onPress={() => setGoalType(g)} style={{ flex: 1 }}>
              <Animated.View
                layout={Layout.springify()}
                style={[
                  styles.goalCard,
                  {
                    backgroundColor:
                      goalType === g ? colors.primary : colors.surfaceAlt,
                    borderColor: goalType === g ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={GOAL_ICON[g]}
                  size={22}
                  color={goalType === g ? "#fff" : colors.textMuted}
                />
                <Text
                  style={[
                    styles.goalText,
                    { color: goalType === g ? "#fff" : colors.text },
                  ]}
                >
                  {GOAL_LABELS[g]}
                </Text>
              </Animated.View>
            </PressableScale>
          ))}
        </View>

        {/* sex toggle */}
        <Text style={[styles.label, { color: colors.textMuted }]}>Sex</Text>
        <View style={styles.segRow}>
          {(["female", "male"] as Sex[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSex(s)}
              style={[
                styles.seg,
                { backgroundColor: sex === s ? colors.primary : colors.surfaceAlt },
              ]}
            >
              <Text
                style={[
                  styles.segText,
                  { color: sex === s ? "#fff" : colors.textMuted },
                ]}
              >
                {s === "female" ? "Female" : "Male"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* numbers */}
        <View style={styles.numRow}>
          <NumInput label="Age" value={age} onChangeText={setAge} unit="yrs" />
          <NumInput label="Weight" value={weight} onChangeText={setWeight} unit="kg" />
          <NumInput label="Height" value={height} onChangeText={setHeight} unit="cm" />
        </View>

        {/* activity */}
        <Text style={[styles.label, { color: colors.textMuted }]}>Activity level</Text>
        <View style={{ gap: 8 }}>
          {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
            <PressableScale key={a} onPress={() => setActivity(a)}>
              <View
                style={[
                  styles.activityRow,
                  {
                    backgroundColor:
                      activity === a ? brand.blue + "18" : colors.surfaceAlt,
                    borderColor: activity === a ? brand.blue : "transparent",
                  },
                ]}
              >
                <Text style={[styles.activityText, { color: colors.text }]}>
                  {ACTIVITY_LABELS[a]}
                </Text>
                {activity === a && (
                  <Ionicons name="checkmark-circle" size={20} color={brand.blue} />
                )}
              </View>
            </PressableScale>
          ))}
        </View>

        {/* live result */}
        <Animated.View entering={FadeInDown} style={{ marginTop: spacing.xl }}>
          <Card style={{ backgroundColor: colors.text }}>
            <Text style={styles.resultLabel}>Your daily target</Text>
            <Text style={styles.resultCal}>
              {result.calories.toLocaleString()}
              <Text style={styles.resultCalUnit}> cal</Text>
            </Text>
            <View style={styles.resultMacros}>
              <ResultMacro label="Protein" value={result.protein_g} color={macros.protein} />
              <ResultMacro label="Carbs" value={result.carbs_g} color={macros.carbs} />
              <ResultMacro label="Fat" value={result.fat_g} color={macros.fat} />
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.saveBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Button label="Save goal" onPress={save} loading={saving} />
      </View>
    </View>
  );
}

function NumInput({
  label,
  value,
  onChangeText,
  unit,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  unit: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.numBox,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="number-pad"
          style={[styles.numInput, { color: colors.text }]}
        />
        <Text style={[styles.unit, { color: colors.textFaint }]}>{unit}</Text>
      </View>
    </View>
  );
}

function ResultMacro({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.rMacro}>
      <View style={[styles.rDot, { backgroundColor: color }]} />
      <Text style={styles.rMacroValue}>{value}g</Text>
      <Text style={styles.rMacroLabel}>{label}</Text>
    </View>
  );
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
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: spacing.lg,
  },
  goalRow: { flexDirection: "row", gap: 8 },
  goalCard: {
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  goalText: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  segRow: { flexDirection: "row", gap: 8 },
  seg: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  segText: { fontSize: 14, fontWeight: "700" },
  numRow: { flexDirection: "row", gap: spacing.md },
  numBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  numInput: { flex: 1, paddingVertical: 13, fontSize: 17, fontWeight: "700" },
  unit: { fontSize: 12, fontWeight: "600" },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  activityText: { fontSize: 15, fontWeight: "600" },
  resultLabel: { color: "#fff", opacity: 0.7, fontSize: 13, fontWeight: "600" },
  resultCal: { color: "#fff", fontSize: 44, fontWeight: "800", marginTop: 4 },
  resultCalUnit: { fontSize: 20, fontWeight: "600", opacity: 0.7 },
  resultMacros: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  rMacro: { alignItems: "center", gap: 4 },
  rDot: { width: 10, height: 10, borderRadius: 5 },
  rMacroValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  rMacroLabel: { color: "#fff", opacity: 0.7, fontSize: 12 },
  saveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
