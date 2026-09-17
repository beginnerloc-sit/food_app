/**
 * PlatePal palette — muted Nordic tones. Calm, natural, low-saturation.
 * The `brand` keys keep their names (coral/yellow/green/blue) so existing
 * screens pick up the new look without edits, but the values are Nordic:
 *
 *   coral  → clay     #C77B58  (muted terracotta; calories / primary accent)
 *   yellow → wheat    #D9B26A  (muted mustard; carbs / streaks)
 *   green  → sage     #7C9885  (muted sage; protein / success)
 *   blue   → fjord    #6E8CA0  (dusty blue; fats / info)
 */

export const brand = {
  coral: "#C77B58",
  coralSoft: "#EEDDD3",
  yellow: "#D9B26A",
  yellowSoft: "#F0E6D2",
  green: "#7C9885",
  greenSoft: "#DDE6DE",
  blue: "#6E8CA0",
  blueSoft: "#DCE4EA",
} as const;

/** Macro colors — used consistently across charts, rings and chips. */
export const macros = {
  calories: brand.coral,
  protein: brand.green,
  carbs: brand.yellow,
  fat: brand.blue,
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  onPrimary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  tabBar: string;
  tabInactive: string;
  overlay: string;
  skeleton: string;
  coral: string;
  coralSoft: string;
  yellow: string;
  yellowSoft: string;
  green: string;
  greenSoft: string;
  blue: string;
  blueSoft: string;
  macros: typeof macros;
}

const palette: { light: ThemeColors; dark: ThemeColors } = {
  // Light: warm stone/fog base, soft edges, lots of whitespace.
  light: {
    background: "#F4F3EF",
    surface: "#FBFAF7",
    surfaceAlt: "#ECEAE3",
    card: "#FBFAF7",
    border: "#E2DFD6",
    text: "#2E3338",
    textMuted: "#6B7178",
    textFaint: "#A0A39D",
    primary: brand.coral,
    onPrimary: "#FBFAF7",
    accent: brand.blue,
    success: brand.green,
    warning: brand.yellow,
    danger: "#B0574F",
    tabBar: "#FBFAF7",
    tabInactive: "#A0A39D",
    overlay: "rgba(46,51,56,0.45)",
    skeleton: "#E7E4DC",
    ...brand,
    macros,
  },
  // Dark: deep slate, cool and calm.
  dark: {
    background: "#1A1E22",
    surface: "#22272C",
    surfaceAlt: "#2B3137",
    card: "#22272C",
    border: "#333A41",
    text: "#E9EAE5",
    textMuted: "#A3A9AD",
    textFaint: "#6C7379",
    primary: "#D08C6A",
    onPrimary: "#1A1E22",
    accent: "#87A2B4",
    success: "#8FB09A",
    warning: "#E0BE7C",
    danger: "#C77B72",
    tabBar: "#1E2327",
    tabInactive: "#6C7379",
    overlay: "rgba(0,0,0,0.6)",
    skeleton: "#2A3037",
    ...brand,
    macros,
  },
};

export default palette;
