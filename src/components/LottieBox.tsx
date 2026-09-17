import React from "react";
import { ViewStyle } from "react-native";
import LottieView from "lottie-react-native";

interface Props {
  source: any;
  size?: number;
  loop?: boolean;
  autoPlay?: boolean;
  style?: ViewStyle;
}

/**
 * Thin wrapper around lottie-react-native.
 * Drop more .json food animations into assets/lottie and pass them as `source`
 * via require("@/../assets/lottie/<name>.json").
 */
export function LottieBox({
  source,
  size = 200,
  loop = true,
  autoPlay = true,
  style,
}: Props) {
  return (
    <LottieView
      source={source}
      autoPlay={autoPlay}
      loop={loop}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
