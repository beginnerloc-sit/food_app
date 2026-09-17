import { useColorScheme } from "react-native";
import palette, { ThemeColors } from "./colors";
import { useThemeMode } from "./mode";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 36,
  xxxl: 56,
} as const;

// Softer, rounder surfaces for the Nordic feel.
export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const font = {
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 22,
    xxl: 28,
    display: 40,
  },
  weight: {
    light: "300",
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    heavy: "800",
  },
} as const;

/** Replacement for the removed StyleSheet.absoluteFillObject. */
export const absoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// Soft, diffuse shadows (low opacity, wide blur) for a calm, lifted feel.
export const shadow = (elevation = 1) => ({
  shadowColor: "#2E3338",
  shadowOffset: { width: 0, height: elevation * 3 },
  shadowOpacity: 0.06 + elevation * 0.015,
  shadowRadius: elevation * 7,
  elevation: elevation * 2,
});

export type Theme = {
  colors: ThemeColors;
  dark: boolean;
  spacing: typeof spacing;
  radius: typeof radius;
  font: typeof font;
  shadow: typeof shadow;
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const { mode } = useThemeMode();
  const dark = mode === "system" ? scheme === "dark" : mode === "dark";
  return {
    colors: dark ? palette.dark : palette.light,
    dark,
    spacing,
    radius,
    font,
    shadow,
  };
}

export { palette };
export * from "./colors";
export * from "./mode";
