import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, macros } from "@/theme";

interface MacroProps {
  label: string;
  value: number;
  goal: number;
  color: string;
}

function MacroBar({ label, value, goal, color }: MacroProps) {
  const { colors } = useTheme();
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  return (
    <View style={styles.macro}>
      <View style={styles.macroHeader}>
        <Text style={[styles.macroLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.macroValue, { color: colors.text }]}>
          {value}
          <Text style={{ color: colors.textFaint }}> / {goal}g</Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
        <View
          style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

interface Props {
  protein: { value: number; goal: number };
  carbs: { value: number; goal: number };
  fat: { value: number; goal: number };
}

export function MacroBars({ protein, carbs, fat }: Props) {
  return (
    <View style={styles.wrap}>
      <MacroBar
        label="Protein"
        value={protein.value}
        goal={protein.goal}
        color={macros.protein}
      />
      <MacroBar
        label="Carbs"
        value={carbs.value}
        goal={carbs.goal}
        color={macros.carbs}
      />
      <MacroBar label="Fat" value={fat.value} goal={fat.goal} color={macros.fat} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  macro: { gap: 6 },
  macroHeader: { flexDirection: "row", justifyContent: "space-between" },
  macroLabel: { fontSize: 13, fontWeight: "600" },
  macroValue: { fontSize: 13, fontWeight: "700" },
  track: { height: 8, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
});
