import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { analyzeMeal } from "@/lib/mealAnalysis";
import { uploadMealPhotoToSupabase } from "@/lib/storage";
import { createLog, addAIComment } from "@/lib/api";
import { generateCaption, generateComment, personaFromProfile } from "@/lib/persona";
import { Button } from "@/components/Button";
import { PressableScale } from "@/components/PressableScale";
import { LottieBox } from "@/components/LottieBox";
import { useTheme, brand, radius, spacing, macros, shadow, absoluteFill } from "@/theme";
import { useI18n } from "@/i18n";
import type { MealPrediction } from "@/types/meal";
import type { MealType } from "@/types/database";

type Stage = "camera" | "analyzing" | "review";
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function Capture() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { t, lang } = useI18n();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [stage, setStage] = useState<Stage>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<MealPrediction | null>(null);
  const [saving, setSaving] = useState(false);

  // editable fields
  const [name, setName] = useState("");
  const [serving, setServing] = useState("");
  const [cal, setCal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [caption, setCaption] = useState("");
  const [captionLoading, setCaptionLoading] = useState(false);

  const writeCaption = async () => {
    if (!name.trim()) {
      Alert.alert(t("capture.mealName"), t("capture.nameMeal"));
      return;
    }
    setCaptionLoading(true);
    try {
      const text = await generateCaption(
        personaFromProfile(profile),
        { meal_name: name, calories: num(cal), serving_size: serving },
        profile?.display_name ?? profile?.username ?? "me",
        lang
      );
      setCaption(text);
    } catch (e: any) {
      Alert.alert("AI unavailable", e.message ?? "Try again.");
    } finally {
      setCaptionLoading(false);
    }
  };

  const runAnalysis = async (uri: string) => {
    setPhotoUri(uri);
    setStage("analyzing");
    try {
      const p = await analyzeMeal(uri);
      setPrediction(p);
      setName(p.meal_name);
      setServing(p.serving_size);
      setCal(String(p.calories));
      setProtein(String(p.protein_g));
      setCarbs(String(p.carbs_g));
      setFat(String(p.fat_g));
      setMealType(p.meal_type);
      setStage("review");
    } catch (e: any) {
      Alert.alert(
        "Couldn't analyze",
        e.message ??
          "Make sure the analyze-meal edge function is deployed with your OpenAI key."
      );
      // Fall back to manual entry.
      setPrediction({
        meal_name: "",
        serving_size: "1 serving",
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        meal_type: "lunch",
        confidence: 0,
        items: [],
      });
      setStage("review");
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
    if (photo?.uri) runAnalysis(photo.uri);
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) runAnalysis(result.assets[0].uri);
  };

  const save = async () => {
    if (!user || !photoUri) return;
    if (!name.trim()) {
      Alert.alert(t("capture.mealName"), t("capture.nameMeal"));
      return;
    }
    setSaving(true);
    try {
      // Upload the meal photo to Supabase Storage (bucket: meal-photos).
      let photoUrl: string | null = null;
      try {
        photoUrl = await uploadMealPhotoToSupabase(photoUri, user.id);
      } catch (uploadErr) {
        console.warn("[capture] upload failed, saving without photo", uploadErr);
      }

      const log = await createLog(user.id, {
        meal_name: name.trim(),
        serving_size: serving.trim(),
        calories: num(cal),
        protein_g: num(protein),
        carbs_g: num(carbs),
        fat_g: num(fat),
        meal_type: mealType,
        photo_url: photoUrl,
        ai_confidence: prediction?.confidence ?? null,
        notes: caption.trim() || null,
      });

      // If the user's AI persona is on with auto-comment, let it react to the
      // new post (fire-and-forget — never block the save on it).
      if (profile?.ai_enabled && profile?.ai_autocomment) {
        generateComment(
          personaFromProfile(profile),
          { meal_name: name.trim(), calories: num(cal), serving_size: serving.trim() },
          profile.display_name ?? profile.username,
          lang
        )
          .then((text) =>
            text
              ? addAIComment(log.id, user.id, text, profile.ai_name, profile.ai_emoji)
              : null
          )
          .catch(() => {});
      }

      reset();
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Couldn't save", e.message ?? "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStage("camera");
    setPhotoUri(null);
    setPrediction(null);
    setName("");
    setServing("");
    setCal("");
    setProtein("");
    setCarbs("");
    setFat("");
    setCaption("");
  };

  // ── permission gate ──
  if (!permission) return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  if (!permission.granted) {
    return (
      <View style={[styles.permWrap, { backgroundColor: colors.background }]}>
        <View style={styles.permInner}>
          <View style={[styles.permBadge, { backgroundColor: colors.primary + "1F" }]}>
            <Ionicons name="camera" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.permTitle, { color: colors.text }]}>
            {t("capture.permTitle")}
          </Text>
          <Text style={[styles.permSub, { color: colors.textMuted }]}>
            {t("capture.permSub")}
          </Text>
          <Button
            label={t("capture.grant")}
            onPress={requestPermission}
            style={{ marginTop: spacing.md }}
          />
          <Pressable onPress={pickPhoto} style={{ marginTop: spacing.lg }}>
            <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>
              {t("capture.pickLibrary")}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── review stage ──
  if (stage === "review") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
          <View>
            {photoUri && (
              <Image source={{ uri: photoUri }} style={styles.reviewPhoto} />
            )}
            <Pressable
              onPress={reset}
              style={[styles.closeBtn, { top: insets.top + 8 }]}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            {prediction && prediction.confidence > 0 && (
              <Animated.View
                entering={FadeInDown}
                style={[styles.aiChip, { top: insets.top + 8 }]}
              >
                <Ionicons name="sparkles" size={13} color="#fff" />
                <Text style={styles.aiChipText}>
                  {t("capture.confident", { n: Math.round(prediction.confidence * 100) })}
                </Text>
              </Animated.View>
            )}
          </View>

          <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.reviewBody}>
            <Text style={[styles.reviewHeading, { color: colors.text }]}>
              {prediction?.confidence ? t("capture.estimate") : t("capture.logMeal")}
            </Text>
            {prediction?.items?.length ? (
              <Text style={[styles.items, { color: colors.textMuted }]}>
                {t("capture.detected", { items: prediction.items.join(", ") })}
              </Text>
            ) : null}

            <Field label={t("capture.mealName")} value={name} onChangeText={setName} />
            <Field
              label={t("capture.serving")}
              value={serving}
              onChangeText={setServing}
            />

            {/* meal type selector */}
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {t("capture.mealType")}
            </Text>
            <View style={styles.typeRow}>
              {MEAL_TYPES.map((mt) => (
                <Pressable
                  key={mt}
                  onPress={() => setMealType(mt)}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor:
                        mealType === mt ? colors.primary : colors.surfaceAlt,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: mealType === mt ? "#fff" : colors.textMuted },
                    ]}
                  >
                    {t(`meal.${mt}`)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* macros grid */}
            <View style={styles.macroGrid}>
              <NumField
                label={t("capture.calories")}
                value={cal}
                onChangeText={setCal}
                color={macros.calories}
              />
              <NumField
                label={t("capture.protein")}
                value={protein}
                onChangeText={setProtein}
                color={macros.protein}
              />
              <NumField
                label={t("capture.carbs")}
                value={carbs}
                onChangeText={setCarbs}
                color={macros.carbs}
              />
              <NumField
                label={t("capture.fat")}
                value={fat}
                onChangeText={setFat}
                color={macros.fat}
              />
            </View>

            {/* caption + AI writer */}
            <View style={styles.captionHeader}>
              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 0 }]}>
                {t("capture.caption")}
              </Text>
              <PressableScale onPress={writeCaption}>
                <View style={[styles.aiWriteBtn, { backgroundColor: brand.blue + "18" }]}>
                  <Ionicons name="sparkles" size={13} color={brand.blue} />
                  <Text style={[styles.aiWriteText, { color: brand.blue }]}>
                    {captionLoading
                      ? `${t("capture.writing")}…`
                      : t("capture.writeWith", {
                          name: `${profile?.ai_emoji ?? "🤖"} ${profile?.ai_name ?? "AI"}`,
                        })}
                  </Text>
                </View>
              </PressableScale>
            </View>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder={t("capture.captionPlaceholder")}
              placeholderTextColor={colors.textFaint}
              multiline
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  color: colors.text,
                  minHeight: 70,
                  textAlignVertical: "top",
                },
              ]}
            />
          </Animated.View>
        </ScrollView>

        <View
          style={[
            styles.saveBar,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Button
            label={t("capture.save")}
            onPress={save}
            loading={saving}
            icon={<Ionicons name="checkmark-circle" size={20} color="#fff" />}
          />
        </View>
      </View>
    );
  }

  // ── analyzing stage ──
  if (stage === "analyzing") {
    return (
      <View style={styles.analyzeWrap}>
        {photoUri && (
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} blurRadius={2} />
        )}
        <View style={styles.analyzeOverlay} />
        <LottieBox
          source={require("../../assets/lottie/coffee.json")}
          size={180}
        />
        <Text style={styles.analyzeText}>{t("capture.analyzing")}</Text>
        <Text style={styles.analyzeSub}>{t("capture.estimating")}</Text>
      </View>
    );
  }

  // ── camera stage ──
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
        <View style={[styles.camTopBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.push("/(tabs)")} style={styles.camClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.camHint}>{t("capture.point")}</Text>
          <View style={{ width: 40 }} />
        </View>
        {/* framing guide */}
        <View style={styles.frame} pointerEvents="none">
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>

        <View style={[styles.camControls, { paddingBottom: insets.bottom + 36 }]}>
          <PressableScale onPress={pickPhoto} style={styles.sideBtn}>
            <Ionicons name="images" size={26} color="#fff" />
          </PressableScale>

          <Pressable onPress={takePhoto}>
            <View style={styles.shutterOuter}>
              <LinearGradient
                colors={[brand.coral, "#D99878"]}
                style={styles.shutterInner}
              />
            </View>
          </Pressable>

          <View style={styles.sideBtn} />
        </View>
      </CameraView>
    </View>
  );
}

function ScannerPulse() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1.3, { duration: 1000 }), -1, true);
    opacity.value = withRepeat(withTiming(0.3, { duration: 1000 }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return (
    <Animated.View style={style}>
      <View style={styles.pulse}>
        <Ionicons name="sparkles" size={40} color="#fff" />
      </View>
    </Animated.View>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textFaint}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />
    </>
  );
}

function NumField({
  label,
  value,
  onChangeText,
  color,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.numField}>
      <View style={styles.numLabelRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 0 }]}>
          {label}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
          },
        ]}
      />
    </View>
  );
}

const num = (s: string) => Math.max(0, parseInt(s || "0", 10) || 0);

const styles = StyleSheet.create({
  permWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  permInner: { width: "100%", maxWidth: 340, alignItems: "center", alignSelf: "center" },
  permBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  permTitle: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  permSub: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
    marginBottom: spacing.md,
    lineHeight: 21,
  },

  camTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  camClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0006",
    alignItems: "center",
    justifyContent: "center",
  },
  camHint: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    backgroundColor: "#0006",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  frame: {
    ...absoluteFill,
    margin: 50,
    marginTop: 120,
    marginBottom: 180,
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: "#fff",
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  camControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  sideBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff3",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 64, height: 64, borderRadius: 32 },

  analyzeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    gap: 12,
  },
  analyzeOverlay: { ...absoluteFill, backgroundColor: "#000A" },
  pulse: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: brand.coral,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  analyzeText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  analyzeSub: { color: "#fff", opacity: 0.7, fontSize: 14 },

  reviewPhoto: { width: "100%", height: 300, backgroundColor: "#0002" },
  closeBtn: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0007",
    alignItems: "center",
    justifyContent: "center",
  },
  aiChip: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: brand.green,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  aiChipText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  reviewBody: {
    padding: spacing.lg,
    marginTop: -20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  reviewHeading: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  items: { fontSize: 13, marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: 16,
  },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  typeText: { fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  macroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  numField: { width: "47%", flexGrow: 1 },
  captionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  aiWriteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  aiWriteText: { fontSize: 12, fontWeight: "700" },
  numLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4 },
  saveBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
