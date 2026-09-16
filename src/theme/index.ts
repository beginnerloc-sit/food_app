import { useColorScheme } from "react-native";
import palette, { ThemeColors } from "./colors";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 26,
    display: 34,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    heavy: "800",
  },
} as const;

export const shadow = (elevation = 1) => ({
  shadowColor: "#12222B",
  shadowOffset: { width: 0, height: elevation * 2 },
  shadowOpacity: 0.08 + elevation * 0.02,
  shadowRadius: elevation * 4,
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
  const dark = scheme === "dark";
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
