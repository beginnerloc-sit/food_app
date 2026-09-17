import React, { useEffect } from "react";
import { ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface Props {
  children: React.ReactNode;
  /** Vertical travel in px. */
  amplitude?: number;
  /** One full bob cycle in ms. */
  duration?: number;
  delay?: number;
  /** Adds a subtle tilt for a 3D feel. */
  tilt?: boolean;
  style?: ViewStyle;
}

/**
 * Gives any element a continuous, gentle floating motion (bob + optional tilt)
 * for a soft 3D-object feel. Pure Reanimated, no assets.
 */
export function Floating({
  children,
  amplitude = 10,
  duration = 2600,
  delay = 0,
  tilt = true,
  style,
}: Props) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, [duration, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -t.value * amplitude },
      { rotateZ: tilt ? `${(t.value - 0.5) * 4}deg` : "0deg" },
      { scale: 1 + t.value * 0.02 },
    ],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}
