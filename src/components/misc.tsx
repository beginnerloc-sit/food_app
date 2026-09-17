import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme, radius, spacing, shadow } from "@/theme";
import { Floating } from "./Floating";

/** Soft, floating card. */
export function Card({
  children,
  style,
  padded = true,
  floating = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  floating?: boolean;
}) {
  const { colors, dark } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: dark ? 1 : 0,
          borderRadius: radius.lg,
          padding: padded ? spacing.xl : 0,
        },
        floating && !dark ? shadow(2) : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Big screen title with optional subtitle and a right-side action. */
export function ScreenHeader({
  title,
  subtitle,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, style]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Small uppercase section label, Nordic-editorial style. */
export function SectionTitle({
  title,
  trailing,
}: {
  title: string;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {title.toUpperCase()}
      </Text>
      {trailing}
    </View>
  );
}

/** Airy empty state with a gently floating icon. */
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeIn} style={styles.empty}>
      <Floating amplitude={7} duration={3000}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name={icon} size={40} color={colors.textFaint} />
        </View>
      </Floating>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.emptySub, { color: colors.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  headerSub: { fontSize: 15, marginTop: 2 },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  empty: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 40 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  emptyTitle: { fontSize: 19, fontWeight: "800", textAlign: "center" },
  emptySub: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
});
