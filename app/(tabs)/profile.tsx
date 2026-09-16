import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/lib/api";
import { uploadMealPhotoToSupabase } from "@/lib/storage";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/misc";
import { Button } from "@/components/Button";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, spacing, radius, brand } from "@/theme";
import { useI18n } from "@/i18n";

export default function ProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [calGoal, setCalGoal] = useState(String(profile?.daily_calorie_goal ?? 2000));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setBio(profile?.bio ?? "");
    setCalGoal(String(profile?.daily_calorie_goal ?? 2000));
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        display_name: displayName.trim(),
        bio: bio.trim(),
        daily_calorie_goal: parseInt(calGoal, 10) || 2000,
      });
      await refreshProfile();
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Oops", e.message);
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async () => {
    if (!user) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (res.canceled || !res.assets[0]) return;
    try {
      const url = await uploadMealPhotoToSupabase(res.assets[0].uri, user.id);
      await updateProfile(user.id, { avatar_url: url });
      await refreshProfile();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message);
    }
  };

  const name = profile?.display_name || profile?.username || "You";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* gradient header */}
        <LinearGradient
          colors={[brand.blue, brand.green]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 20 }]}
        >
          <Animated.View entering={FadeInDown} style={{ alignItems: "center" }}>
            <PressableScale onPress={changeAvatar}>
              <View>
                <Avatar uri={profile?.avatar_url} name={name} size={92} />
                <View style={styles.editAvatar}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </View>
            </PressableScale>
            <Text style={styles.headerName}>{name}</Text>
            <Text style={styles.headerUser}>@{profile?.username}</Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.content}>
          {/* stats */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <Card>
              <View style={styles.statsRow}>
                <Stat value={String(profile?.streak_count ?? 0)} label={t("profile.dayStreak")} icon="flame" color={brand.coral} />
                <Divider />
                <Stat value={String(profile?.daily_calorie_goal ?? 0)} label={t("profile.dailyGoal")} icon="flag" color={brand.green} />
              </View>
            </Card>
          </Animated.View>

          {/* profile details / edit */}
          <Animated.View entering={FadeInDown.delay(150)} style={{ marginTop: spacing.lg }}>
            <Card>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {t("profile.title")}
                </Text>
                <PressableScale onPress={() => (editing ? save() : setEditing(true))}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {editing ? (saving ? t("common.saving") : t("common.save")) : t("profile.edit")}
                  </Text>
                </PressableScale>
              </View>

              {editing ? (
                <>
                  <EditField label={t("profile.displayName")} value={displayName} onChangeText={setDisplayName} />
                  <EditField label={t("profile.bio")} value={bio} onChangeText={setBio} multiline />
                  <EditField
                    label={t("profile.calGoal")}
                    value={calGoal}
                    onChangeText={setCalGoal}
                    keyboardType="number-pad"
                  />
                </>
              ) : (
                <Text style={[styles.bio, { color: colors.textMuted }]}>
                  {profile?.bio || t("profile.noBio")}
                </Text>
              )}
            </Card>
          </Animated.View>

          {/* quick actions */}
          <Animated.View entering={FadeInDown.delay(175)} style={{ marginTop: spacing.lg }}>
            <Card padded={false}>
              <MenuRow
                icon="options-outline"
                color={brand.coral}
                title={t("profile.setGoal")}
                subtitle={t("profile.setGoalSub")}
                onPress={() => router.push("/goals")}
              />
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 64 }} />
              <MenuRow
                icon="chatbubbles-outline"
                color={brand.green}
                title={t("profile.talkChef")}
                subtitle={t("profile.talkChefSub")}
                onPress={() => router.push("/coach")}
              />
              <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 64 }} />
              <MenuRow
                icon="sparkles-outline"
                color={brand.blue}
                title={t("profile.aiPersona")}
                subtitle={
                  profile?.ai_enabled
                    ? t("profile.aiActive", { emoji: profile.ai_emoji, name: profile.ai_name })
                    : t("profile.aiInactive")
                }
                onPress={() => router.push("/ai-persona")}
              />
            </Card>
          </Animated.View>

          {/* language */}
          <Animated.View entering={FadeInDown.delay(225)} style={{ marginTop: spacing.lg }}>
            <Card>
              <View style={styles.integrationRow}>
                <View style={[styles.intIcon, { backgroundColor: brand.coral + "22" }]}>
                  <Ionicons name="language" size={22} color={brand.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.intTitle, { color: colors.text }]}>
                    {t("profile.language")}
                  </Text>
                  <Text style={[styles.intSub, { color: colors.textMuted }]}>
                    {t("profile.languageSub")}
                  </Text>
                </View>
                <View style={[styles.langToggle, { backgroundColor: colors.surfaceAlt }]}>
                  {(["en", "vi"] as const).map((l) => (
                    <PressableScale key={l} onPress={() => setLang(l)}>
                      <View
                        style={[
                          styles.langBtn,
                          { backgroundColor: lang === l ? colors.primary : "transparent" },
                        ]}
                      >
                        <Text
                          style={{
                            color: lang === l ? "#fff" : colors.textMuted,
                            fontWeight: "800",
                            fontSize: 13,
                          }}
                        >
                          {l === "en" ? "EN" : "VI"}
                        </Text>
                      </View>
                    </PressableScale>
                  ))}
                </View>
              </View>
            </Card>
          </Animated.View>

          <View style={{ marginTop: spacing.xl }}>
            <Button
              label={t("profile.signOut")}
              variant="secondary"
              onPress={() =>
                Alert.alert(t("profile.signOut"), t("profile.signOutConfirm"), [
                  { text: t("common.cancel"), style: "cancel" },
                  { text: t("profile.signOut"), style: "destructive", onPress: signOut },
                ])
              }
              icon={<Ionicons name="log-out-outline" size={20} color={colors.text} />}
            />
          </View>

          <Text style={[styles.version, { color: colors.textFaint }]}>
            PlatePal v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function MenuRow({
  icon,
  color,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress}>
      <View style={styles.menuRow}>
        <View style={[styles.intIcon, { backgroundColor: color + "22" }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.intTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.intSub, { color: colors.textMuted }]}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
      </View>
    </PressableScale>
  );
}

function Stat({
  value,
  label,
  icon,
  color,
}: {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={{ width: 1, backgroundColor: colors.border }} />;
}

function EditField({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={[styles.editLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[
          styles.editInput,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 30,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  editAvatar: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: brand.coral,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerName: { fontSize: 22, fontWeight: "800", color: "#fff", marginTop: 12 },
  headerUser: { fontSize: 14, color: "#fff", opacity: 0.9, marginTop: 2 },
  content: { paddingHorizontal: spacing.lg, marginTop: -spacing.md },
  statsRow: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 17, fontWeight: "800" },
  bio: { fontSize: 14, marginTop: spacing.md, lineHeight: 20 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  langToggle: { flexDirection: "row", borderRadius: radius.pill, padding: 3, gap: 2 },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  integrationRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  intIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  intTitle: { fontSize: 15, fontWeight: "700" },
  intSub: { fontSize: 12, marginTop: 2 },
  editLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  editInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 15,
  },
  version: { textAlign: "center", marginTop: spacing.xl, fontSize: 12 },
});
