import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { format } from "date-fns";
import { useTheme, radius, brand } from "@/theme";

interface Props {
  data: { day: string; calories: number }[];
  goal: number;
}

/** Animated 7-day calorie bar chart. Bars grow up on mount. */
export function WeeklyChart({ data, goal }: Props) {
  const { colors } = useTheme();
  const max = Math.max(goal, ...data.map((d) => d.calories), 1);
  const chartHeight = 120;

  return (
    <View>
      <View style={[styles.chart, { height: chartHeight }]}>
        {/* goal line */}
        <View
          style={[
            styles.goalLine,
            {
              bottom: (goal / max) * chartHeight,
              borderColor: colors.textFaint,
            },
          ]}
        />
        {data.map((d, i) => (
          <Bar
            key={d.day}
            value={d.calories}
            max={max}
            height={chartHeight}
            over={d.calories > goal}
            index={i}
            label={format(new Date(d.day), "EEE")[0]}
          />
        ))}
      </View>
    </View>
  );
}

function Bar({
  value,
  max,
  height,
  over,
  index,
  label,
}: {
  value: number;
  max: number;
  height: number;
  over: boolean;
  index: number;
  label: string;
}) {
  const { colors } = useTheme();
  const h = useSharedValue(0);
  const target = (value / max) * height;

  useEffect(() => {
    h.value = withDelay(index * 70, withTiming(target, { duration: 600 }));
  }, [target]);

  const animStyle = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <View style={styles.barCol}>
      <Animated.View
        style={[
          styles.bar,
          animStyle,
          { backgroundColor: over ? colors.danger : brand.coral },
        ]}
      />
      <Text style={[styles.barLabel, { color: colors.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    position: "relative",
  },
  goalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 6 },
  bar: { width: 20, borderRadius: radius.sm, minHeight: 4 },
  barLabel: { fontSize: 11, fontWeight: "600" },
});
