import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, brand, shadow } from "@/theme";

// Minimal shape of the props expo-router's <Tabs tabBar> passes, so we don't
// depend on @react-navigation/bottom-tabs types directly.
type TabRoute = { key: string; name: string };
type BottomTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: {
      type: "tabPress";
      target: string;
      canPreventDefault: boolean;
    }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};
import { useI18n } from "@/i18n";

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  index: { on: "home", off: "home-outline" },
  track: { on: "stats-chart", off: "stats-chart-outline" },
  friends: { on: "people", off: "people-outline" },
  profile: { on: "person", off: "person-outline" },
};

const LABEL_KEY: Record<string, string> = {
  index: "tab.feed",
  track: "tab.track",
  friends: "tab.friends",
  profile: "tab.profile",
};

/** Custom bottom tab bar: animated tabs + a raised gradient capture FAB. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  // Full-screen camera: hide the tab bar on the capture route.
  if (state.routes[state.index]?.name === "capture") return null;

  // Tabs to render, excluding hidden routes (capture, notifications).
  const visible = state.routes.filter(
    (r) => r.name === "index" || r.name === "track" || r.name === "friends" || r.name === "profile"
  );
  const captureRoute = state.routes.find((r) => r.name === "capture");

  // Split into two halves around the center FAB.
  const left = visible.slice(0, 2);
  const right = visible.slice(2);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const icon = ICONS[route.name];
    if (!icon) return null;
    return (
      <TabItem
        key={route.key}
        focused={focused}
        icon={focused ? icon.on : icon.off}
        label={t(LABEL_KEY[route.name])}
        onPress={() => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}
      />
    );
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: insets.bottom || 10,
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {left.map(renderTab)}
        {/* center capture FAB */}
        {captureRoute && (
          <CaptureButton
            onPress={() => navigation.navigate(captureRoute.name)}
          />
        )}
        {right.map(renderTab)}
      </View>
    </View>
  );
}

function TabItem({
  focused,
  icon,
  label,
  onPress,
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const lift = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    lift.value = withSpring(focused ? 1 : 0, { damping: 14 });
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: -lift.value * 2 }],
  }));

  return (
    <Pressable
      style={styles.tab}
      onPress={onPress}
      onPressIn={() => (scale.value = withSpring(0.85))}
      onPressOut={() => (scale.value = withSpring(1))}
    >
      <Animated.View style={[styles.tabInner, animStyle]}>
        <Ionicons
          name={icon}
          size={24}
          color={focused ? colors.primary : colors.tabInactive}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: focused ? colors.primary : colors.tabInactive },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CaptureButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));
  return (
    <Pressable
      style={styles.fabWrap}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.9);
        rotate.value = withTiming(90, { duration: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
        rotate.value = withTiming(0, { duration: 200 });
      }}
    >
      <Animated.View style={[animStyle, shadow(3)]}>
        <LinearGradient
          colors={[brand.coral, "#D99878"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="camera" size={28} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, paddingTop: 8 },
  row: { flexDirection: "row", alignItems: "center" },
  tab: { flex: 1, alignItems: "center" },
  tabInner: { alignItems: "center", gap: 3 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
  fabWrap: { width: 76, alignItems: "center", justifyContent: "center" },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28,
  },
});
