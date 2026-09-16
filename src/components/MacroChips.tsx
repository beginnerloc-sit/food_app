import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, macros, radius } from "@/theme";

interface Props {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  compact?: boolean;
}

/** Row of macro pills used on cards and detail screens. */
export function MacroChips({ calories, protein, carbs, fat, compact }: Props) {
  const items = [
    { label: "cal", value: calories, color: macros.calories },
    { label: "P", value: `${protein}g`, color: macros.protein },
    { label: "C", value: `${carbs}g`, color: macros.carbs },
    { label: "F", value: `${fat}g`, color: macros.fat },
  ];
  return (
    <View style={styles.row}>
      {items.map((it) => (
        <Pill key={it.label} {...it} compact={compact} />
      ))}
    </View>
  );
}

function Pill({
  label,
  value,
  color,
  compact,
}: {
  label: string;
  value: string | number;
  color: string;
  compact?: boolean;
}) {
  const { colors, dark } = useTheme();
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: dark ? colors.surfaceAlt : color + "1A",
          paddingVertical: compact ? 4 : 6,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  value: { fontSize: 13, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "500" },
});
