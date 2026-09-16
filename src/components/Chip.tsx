import React from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  useDerivedValue,
} from "react-native-reanimated";
import { PressableScale } from "./PressableScale";
import { useTheme, radius } from "@/theme";

interface Props {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}

/** Pill filter chip that animates its background/text when toggled active. */
export function Chip({ label, active, onPress, color }: Props) {
  const { colors } = useTheme();
  const accent = color ?? colors.primary;
  const progress = useDerivedValue(() =>
    withTiming(active ? 1 : 0, { duration: 200 })
  );

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.surfaceAlt, accent]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, accent]
    ),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.textMuted, "#fff"]),
  }));

  return (
    <PressableScale onPress={onPress}>
      <Animated.View style={[styles.chip, animStyle]}>
        <Animated.Text style={[styles.text, textStyle]}>{label}</Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: { fontSize: 13, fontWeight: "700" },
});
