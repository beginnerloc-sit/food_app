/**
 * PlatePal palette — built from the four brand colors.
 *
 *   Coral   #FF7F50  rgb(255,127,80)   → primary / calories / CTAs
 *   Yellow  #FFD166  rgb(255,209,102)  → highlights, streaks, carbs
 *   Green   #06D6A0  rgb(6,214,160)    → success, protein, "on track"
 *   Blue    #118AB2  rgb(17,138,178)   → info, links, fats, brand chrome
 */

export const brand = {
  coral: "#FF7F50",
  coralSoft: "#FFE4D8",
  yellow: "#FFD166",
  yellowSoft: "#FFF3D6",
  green: "#06D6A0",
  greenSoft: "#D3F8EC",
  blue: "#118AB2",
  blueSoft: "#D2ECF3",
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
  light: {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceAlt: "#F6F8FA",
    card: "#FFFFFF",
    border: "#ECEFF3",
    text: "#12222B",
    textMuted: "#5C6B73",
    textFaint: "#9AA7AE",
    primary: brand.coral,
    onPrimary: "#FFFFFF",
    accent: brand.blue,
    success: brand.green,
    warning: brand.yellow,
    danger: "#EF476F",
    tabBar: "#FFFFFF",
    tabInactive: "#9AA7AE",
    overlay: "rgba(18,34,43,0.5)",
    skeleton: "#EEF1F4",
    ...brand,
    macros,
  },
  dark: {
    background: "#0E1417",
    surface: "#151D22",
    surfaceAlt: "#1B252B",
    card: "#151D22",
    border: "#233037",
    text: "#F2F6F8",
    textMuted: "#9DB0B9",
    textFaint: "#63757E",
    primary: brand.coral,
    onPrimary: "#12222B",
    accent: "#3FB4D6",
    success: brand.green,
    warning: brand.yellow,
    danger: "#FF6B8B",
    tabBar: "#12191E",
    tabInactive: "#63757E",
    overlay: "rgba(0,0,0,0.6)",
    skeleton: "#1E282E",
    ...brand,
    macros,
  },
};

export default palette;
