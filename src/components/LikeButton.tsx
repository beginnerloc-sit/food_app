import React from "react";
import { Text, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { PressableScale } from "./PressableScale";
import { useTheme } from "@/theme";

interface Props {
  liked: boolean;
  count: number;
  onToggle: () => void;
}

/** Heart that pops with a spring bounce when liked. */
export function LikeButton({ liked, count, onToggle }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handle = () => {
    if (!liked) {
      scale.value = withSequence(
        withSpring(1.4, { damping: 6, stiffness: 300 }),
        withSpring(1, { damping: 10 })
      );
    }
    onToggle();
  };

  return (
    <PressableScale onPress={handle} style={styles.row} scaleTo={0.9}>
      <Animated.View style={animStyle}>
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={22}
          color={liked ? colors.danger : colors.textMuted}
        />
      </Animated.View>
      {count > 0 && (
        <Text style={[styles.count, { color: colors.textMuted }]}>{count}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  count: { fontSize: 14, fontWeight: "600" },
});
