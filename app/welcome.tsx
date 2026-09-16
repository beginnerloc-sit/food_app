import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Pressable,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { useTheme, spacing, brand } from "@/theme";
import { useI18n } from "@/i18n";

export const WELCOME_KEY = "platepal.welcomeSeen";

const SLIDES = [
  { icon: "camera", color: brand.coral, k: "1" },
  { icon: "stats-chart", color: brand.green, k: "2" },
  { icon: "people", color: brand.blue, k: "3" },
] as const;

export default function Welcome() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const finish = async () => {
    await AsyncStorage.setItem(WELCOME_KEY, "1").catch(() => {});
    router.replace("/");
  };

  const next = () => {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    } else {
      finish();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Pressable
        onPress={finish}
        style={[styles.skip, { top: insets.top + 8 }]}
        hitSlop={12}
      >
        <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 15 }}>
          {t("welcome.skip")}
        </Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View key={s.k} style={[styles.slide, { width }]}>
            <LinearGradient
              colors={[s.color, s.color + "AA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.art}
            >
              <Ionicons name={s.icon as any} size={92} color="#fff" />
            </LinearGradient>
            <Text style={[styles.title, { color: colors.text }]}>
              {t(`welcome.${s.k}.title`)}
            </Text>
            <Text style={[styles.sub, { color: colors.textMuted }]}>
              {t(`welcome.${s.k}.sub`)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              entering={FadeIn}
              style={[
                styles.dot,
                {
                  width: i === page ? 22 : 8,
                  backgroundColor: i === page ? colors.primary : colors.border,
                },
              ]}
            />
          ))}
        </View>
        <Button
          label={page === SLIDES.length - 1 ? t("welcome.start") : t("welcome.next")}
          onPress={next}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skip: { position: "absolute", right: spacing.xl, zIndex: 10 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    gap: spacing.xl,
  },
  art: {
    width: 180,
    height: 180,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center" },
  sub: { fontSize: 16, textAlign: "center", lineHeight: 23, marginTop: -8 },
  footer: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
