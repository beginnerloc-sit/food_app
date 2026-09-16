import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme, brand } from "@/theme";

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
}

const RING_COLORS = [brand.coral, brand.yellow, brand.green, brand.blue];

/** Circular avatar with image fallback to colorful initials. */
export function Avatar({ uri, name, size = 44, ring = false }: Props) {
  const { colors } = useTheme();
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Deterministic color from the name.
  const colorIndex =
    (name ?? "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
    RING_COLORS.length;
  const bg = RING_COLORS[colorIndex];

  const inner = uri ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      transition={150}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: size * 0.4 }}>
        {initials}
      </Text>
    </View>
  );

  if (!ring) return inner;

  return (
    <View
      style={{
        padding: 2.5,
        borderRadius: (size + 6) / 2,
        borderWidth: 2.5,
        borderColor: bg,
        backgroundColor: colors.background,
      }}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
});
