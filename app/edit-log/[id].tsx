import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { getLog, updateLog } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, radius, macros } from "@/theme";
import { useI18n } from "@/i18n";
import type { MealType } from "@/types/database";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const num = (s: string) => Math.max(0, parseInt(s || "0", 10) || 0);

export default function EditLog() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [serving, setServing] = useState("");
  const [cal, setCal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!id || !user) return;
    getLog(id, user.id).then((log) => {
      if (log) {
        setName(log.meal_name);
        setServing(log.serving_size ?? "");
        setCal(String(log.calories));
        setProtein(String(log.protein_g));
        setCarbs(String(log.carbs_g));
        setFat(String(log.fat_g));
        setMealType(log.meal_type);
        setNotes(log.notes ?? "");
      }
      setLoading(false);
    });
  }, [id, user]);

  const save = async () => {
    if (!id) return;
    if (!name.trim()) {
      Alert.alert(t("capture.mealName"), t("capture.nameMeal"));
      return;
    }
    setSaving(true);
    try {
      await updateLog(id, {
        meal_name: name.trim(),
        serving_size: serving.trim(),
        calories: num(cal),
        protein_g: num(protein),
        carbs_g: num(carbs),
        fat_g: num(fat),
        meal_type: mealType,
        notes: notes.trim() || null,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message ?? "Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <PressableScale onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </PressableScale>
        <Text style={[styles.title, { color: colors.text }]}>{t("log.editMeal")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        <Field label={t("capture.mealName")} value={name} onChangeText={setName} />
        <Field label={t("capture.serving")} value={serving} onChangeText={setServing} />

        <Text style={[styles.label, { color: colors.textMuted }]}>{t("capture.mealType")}</Text>
        <View style={styles.typeRow}>
          {MEAL_TYPES.map((mt) => (
            <Pressable
              key={mt}
              onPress={() => setMealType(mt)}
              style={[
                styles.typeBtn,
                { backgroundColor: mealType === mt ? colors.primary : colors.surfaceAlt },
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: mealType === mt ? "#fff" : colors.textMuted },
                ]}
              >
                {t(`meal.${mt}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.grid}>
          <NumField label={t("capture.calories")} value={cal} onChangeText={setCal} color={macros.calories} />
          <NumField label={t("capture.protein")} value={protein} onChangeText={setProtein} color={macros.protein} />
          <NumField label={t("capture.carbs")} value={carbs} onChangeText={setCarbs} color={macros.carbs} />
          <NumField label={t("capture.fat")} value={fat} onChangeText={setFat} color={macros.fat} />
        </View>

        <Text style={[styles.label, { color: colors.textMuted }]}>{t("capture.caption")}</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder={t("capture.captionPlaceholder")}
          placeholderTextColor={colors.textFaint}
          multiline
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.border,
              color: colors.text,
              minHeight: 70,
              textAlignVertical: "top",
            },
          ]}
        />
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
        <Button label={t("log.saveChanges")} onPress={save} loading={saving} />
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textFaint}
        style={[
          styles.input,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text },
        ]}
      />
    </>
  );
}

function NumField({
  label,
  value,
  onChangeText,
  color,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.numField}>
      <View style={styles.numLabelRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.label, { color: colors.textMuted, marginTop: 0, marginBottom: 0 }]}>
          {label}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: 16,
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: "center" },
  typeText: { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  numField: { width: "47%", flexGrow: 1 },
  numLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
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
