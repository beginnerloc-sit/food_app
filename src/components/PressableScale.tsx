import React from "react";
import { Pressable, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
}

/** Wrap anything to give it a subtle spring scale-down when pressed. */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  scaleTo = 0.97,
  disabled,
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() =>
        (scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 }))
      }
      onPressOut={() =>
        (scale.value = withSpring(1, { damping: 12, stiffness: 250 }))
      }
      style={[animStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
