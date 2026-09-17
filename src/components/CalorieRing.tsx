import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useTheme, absoluteFill } from "@/theme";
import { useI18n } from "@/i18n";

interface Props {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

/**
 * Big calorie progress ring. Fills coral, turns green-tinted at goal,
 * warns if over budget.
 */
export function CalorieRing({
  consumed,
  goal,
  size = 200,
  strokeWidth = 18,
}: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const over = consumed > goal;
  const remaining = goal - consumed;

  const ringColor = over ? colors.danger : colors.primary;
  const dashOffset = circumference * (1 - pct);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.surfaceAlt}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.big, { color: colors.text }]}>
          {Math.abs(remaining).toLocaleString()}
        </Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {over ? t("track.calOver") : t("track.calLeft")}
        </Text>
        <Text style={[styles.sub, { color: colors.textFaint }]}>
          {consumed.toLocaleString()} / {goal.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  big: { fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  label: { fontSize: 14, fontWeight: "600", marginTop: -2 },
  sub: { fontSize: 12, marginTop: 6 },
});
