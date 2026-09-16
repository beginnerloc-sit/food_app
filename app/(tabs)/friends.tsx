import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import {
  getFriends,
  searchProfiles,
  sendFriendRequest,
  respondToRequest,
  removeFriend,
  getCircle,
  setCircleMember,
  FriendEdge,
} from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { PressableScale } from "@/components/PressableScale";
import { SectionTitle, EmptyState } from "@/components/misc";
import { useTheme, spacing, radius, brand } from "@/theme";
import { useI18n } from "@/i18n";
import type { Profile } from "@/types/database";

export default function Friends() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useI18n();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [accepted, setAccepted] = useState<FriendEdge[]>([]);
  const [incoming, setIncoming] = useState<FriendEdge[]>([]);
  const [outgoing, setOutgoing] = useState<FriendEdge[]>([]);
  const [circle, setCircle] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    const [f, c] = await Promise.all([getFriends(user.id), getCircle(user.id)]);
    setAccepted(f.accepted);
    setIncoming(f.incoming);
    setOutgoing(f.outgoing);
    setCircle(new Set(c));
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const runSearch = async (q: string) => {
    setQuery(q);
    if (!user || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const r = await searchProfiles(q, user.id);
    setResults(r);
    setSearching(false);
  };

  const add = async (target: Profile) => {
    if (!user) return;
    await sendFriendRequest(user.id, target.id);
    setResults((prev) => prev.filter((p) => p.id !== target.id));
    load();
  };

  const respond = async (edge: FriendEdge, accept: boolean) => {
    await respondToRequest(edge.friendshipId, accept);
    load();
  };

  const toggleCircle = async (memberId: string) => {
    if (!user) return;
    const has = circle.has(memberId);
    const next = new Set(circle);
    has ? next.delete(memberId) : next.add(memberId);
    setCircle(next);
    await setCircleMember(user.id, memberId, !has);
  };

  const outgoingIds = new Set(outgoing.map((e) => e.profile.id));
  const friendIds = new Set(accepted.map((e) => e.profile.id));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>{t("friends.title")}</Text>

        {/* search */}
        <View
          style={[
            styles.search,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={runSearch}
            placeholder={t("friends.search")}
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searching && <ActivityIndicator size="small" color={colors.primary} />}
        </View>

        {/* search results */}
        {results.length > 0 && (
          <View style={styles.section}>
            {results.map((p) => (
              <Animated.View key={p.id} entering={FadeIn}>
                <UserRow
                  profile={p}
                  trailing={
                    friendIds.has(p.id) ? (
                      <Tag label={t("friends.friendsTag")} color={brand.green} />
                    ) : outgoingIds.has(p.id) ? (
                      <Tag label={t("friends.requested")} color={brand.yellow} />
                    ) : (
                      <ActionBtn icon="person-add" label={t("friends.add")} onPress={() => add(p)} />
                    )
                  }
                />
              </Animated.View>
            ))}
          </View>
        )}

        {/* incoming requests */}
        {incoming.length > 0 && (
          <View style={styles.section}>
            <SectionTitle title={t("friends.requests", { n: incoming.length })} />
            {incoming.map((edge) => (
              <Animated.View key={edge.friendshipId} entering={FadeInDown} layout={Layout}>
                <UserRow
                  profile={edge.profile}
                  trailing={
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <RoundBtn
                        icon="checkmark"
                        bg={brand.green}
                        onPress={() => respond(edge, true)}
                      />
                      <RoundBtn
                        icon="close"
                        bg={colors.surfaceAlt}
                        fg={colors.textMuted}
                        onPress={() => respond(edge, false)}
                      />
                    </View>
                  }
                />
              </Animated.View>
            ))}
          </View>
        )}

        {/* tracker circle explainer + friends list */}
        <View style={styles.section}>
          <SectionTitle title={t("friends.yours", { n: accepted.length })} />
          <View style={[styles.hint, { backgroundColor: brand.blue + "14" }]}>
            <Ionicons name="notifications" size={16} color={brand.blue} />
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              {t("friends.hintPre")}
              <Text style={{ fontWeight: "700", color: colors.text }}>
                {t("friends.circle")}
              </Text>
              {t("friends.hintPost")}
            </Text>
          </View>

          {accepted.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title={t("friends.empty.title")}
              subtitle={t("friends.empty.sub")}
            />
          ) : (
            accepted.map((edge) => (
              <Animated.View key={edge.friendshipId} entering={FadeInDown} layout={Layout}>
                <UserRow
                  profile={edge.profile}
                  trailing={
                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                      <BellToggle
                        active={circle.has(edge.profile.id)}
                        onPress={() => toggleCircle(edge.profile.id)}
                      />
                      <RoundBtn
                        icon="ellipsis-horizontal"
                        bg={colors.surfaceAlt}
                        fg={colors.textMuted}
                        onPress={() => removeFriend(edge.friendshipId).then(load)}
                      />
                    </View>
                  }
                />
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function UserRow({
  profile,
  trailing,
}: {
  profile: Profile;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const name = profile.display_name || profile.username;
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Avatar uri={profile.avatar_url} name={name} size={46} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.username, { color: colors.textFaint }]}>
          @{profile.username}
        </Text>
      </View>
      {trailing}
    </View>
  );
}

function BellToggle({ active, onPress }: { active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale onPress={onPress}>
      <Animated.View
        layout={Layout.springify()}
        style={[
          styles.bellToggle,
          {
            backgroundColor: active ? brand.coral : colors.surfaceAlt,
          },
        ]}
      >
        <Ionicons
          name={active ? "notifications" : "notifications-off-outline"}
          size={18}
          color={active ? "#fff" : colors.textMuted}
        />
      </Animated.View>
    </PressableScale>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress}>
      <View style={[styles.actionBtn, { backgroundColor: brand.coral }]}>
        <Ionicons name={icon} size={15} color="#fff" />
        <Text style={styles.actionLabel}>{label}</Text>
      </View>
    </PressableScale>
  );
}

function RoundBtn({
  icon,
  bg,
  fg = "#fff",
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  fg?: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress}>
      <View style={[styles.roundBtn, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={fg} />
      </View>
    </PressableScale>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + "22" }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  name: { fontSize: 16, fontWeight: "700" },
  username: { fontSize: 13, marginTop: 1 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  actionLabel: { color: "#fff", fontWeight: "700", fontSize: 13 },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  bellToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  tagText: { fontSize: 12, fontWeight: "700" },
  hint: {
    flexDirection: "row",
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  hintText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
