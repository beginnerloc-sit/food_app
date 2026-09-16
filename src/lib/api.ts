import { supabase } from "./supabase";
import type {
  Profile,
  FoodLog,
  FoodLogWithAuthor,
  CommentWithAuthor,
  NotificationWithActor,
  MealType,
} from "@/types/database";
import { format } from "date-fns";

const authorCols = "id, username, display_name, avatar_url";

// ─────────────────────────────── Profiles ──────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Profile>
): Promise<void> {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function searchProfiles(
  q: string,
  excludeId: string
): Promise<Profile[]> {
  if (!q.trim()) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .neq("id", excludeId)
    .limit(20);
  return data ?? [];
}

// ──────────────────────────────── Logs ─────────────────────────────────────

export interface CreateLogInput {
  meal_name: string;
  serving_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  photo_url: string | null;
  ai_confidence: number | null;
  notes?: string | null;
}

export async function createLog(
  userId: string,
  input: CreateLogInput
): Promise<FoodLog> {
  const { data, error } = await supabase
    .from("food_logs")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLog(logId: string): Promise<void> {
  const { error } = await supabase.from("food_logs").delete().eq("id", logId);
  if (error) throw error;
}

export async function getMyLogsForDay(
  userId: string,
  day: Date
): Promise<FoodLog[]> {
  const dayStr = format(day, "yyyy-MM-dd");
  const start = `${dayStr}T00:00:00`;
  const end = `${dayStr}T23:59:59.999`;
  const { data } = await supabase
    .from("food_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", start)
    .lte("logged_at", end)
    .order("logged_at", { ascending: false });
  return data ?? [];
}

export interface DailyTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  log_count: number;
}

export async function getDailyTotals(
  userId: string,
  day: Date
): Promise<DailyTotals> {
  const { data, error } = await supabase.rpc("daily_totals", {
    target_user: userId,
    day: format(day, "yyyy-MM-dd"),
  });
  if (error || !data?.[0]) {
    return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, log_count: 0 };
  }
  return data[0] as DailyTotals;
}

/** Weekly calorie totals (last 7 days incl. today) for the bar chart. */
export async function getWeeklyCalories(
  userId: string
): Promise<{ day: string; calories: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("food_logs")
    .select("calories, logged_at")
    .eq("user_id", userId)
    .gte("logged_at", since.toISOString());

  const buckets: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets[format(d, "yyyy-MM-dd")] = 0;
  }
  (data ?? []).forEach((row) => {
    const key = format(new Date(row.logged_at), "yyyy-MM-dd");
    if (key in buckets) buckets[key] += row.calories;
  });
  return Object.entries(buckets).map(([day, calories]) => ({ day, calories }));
}

// ──────────────────────────────── Feed ─────────────────────────────────────

export async function getFeed(
  userId: string,
  limit = 30
): Promise<FoodLogWithAuthor[]> {
  // The RLS "logs read" policy already limits rows to me + accepted friends.
  const { data, error } = await supabase
    .from("food_logs")
    .select(
      `*, author:profiles!food_logs_user_id_fkey(${authorCols}),
       log_likes(user_id), log_comments(id)`
    )
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const likes = row.log_likes ?? [];
    return {
      ...row,
      author: row.author,
      like_count: likes.length,
      comment_count: (row.log_comments ?? []).length,
      liked_by_me: likes.some((l: any) => l.user_id === userId),
    } as FoodLogWithAuthor;
  });
}

export async function getLog(
  logId: string,
  userId: string
): Promise<FoodLogWithAuthor | null> {
  const { data } = await supabase
    .from("food_logs")
    .select(
      `*, author:profiles!food_logs_user_id_fkey(${authorCols}),
       log_likes(user_id), log_comments(id)`
    )
    .eq("id", logId)
    .maybeSingle();
  if (!data) return null;
  const likes = (data as any).log_likes ?? [];
  return {
    ...(data as any),
    like_count: likes.length,
    comment_count: ((data as any).log_comments ?? []).length,
    liked_by_me: likes.some((l: any) => l.user_id === userId),
  };
}

// ──────────────────────────── Likes & comments ─────────────────────────────

export async function toggleLike(
  logId: string,
  userId: string,
  currentlyLiked: boolean
): Promise<void> {
  if (currentlyLiked) {
    await supabase
      .from("log_likes")
      .delete()
      .eq("log_id", logId)
      .eq("user_id", userId);
  } else {
    await supabase.from("log_likes").insert({ log_id: logId, user_id: userId });
  }
}

export async function getComments(logId: string): Promise<CommentWithAuthor[]> {
  const { data } = await supabase
    .from("log_comments")
    .select(`*, author:profiles!log_comments_user_id_fkey(${authorCols})`)
    .eq("log_id", logId)
    .order("created_at", { ascending: true });
  return (data ?? []) as any;
}

export async function addComment(
  logId: string,
  userId: string,
  body: string
): Promise<void> {
  const { error } = await supabase
    .from("log_comments")
    .insert({ log_id: logId, user_id: userId, body });
  if (error) throw error;
}

/** Insert a comment authored by the user's AI persona (rendered as the AI). */
export async function addAIComment(
  logId: string,
  ownerId: string,
  body: string,
  aiName: string,
  aiEmoji: string
): Promise<void> {
  const { error } = await supabase.from("log_comments").insert({
    log_id: logId,
    user_id: ownerId,
    body,
    is_ai: true,
    ai_name: aiName,
    ai_emoji: aiEmoji,
  });
  if (error) throw error;
}

// ────────────────────────────── Friendships ────────────────────────────────

export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string
): Promise<void> {
  const { error } = await supabase.from("friendships").insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: "pending",
  });
  if (error) throw error;
}

export async function respondToRequest(
  friendshipId: string,
  accept: boolean
): Promise<void> {
  if (accept) {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);
  } else {
    await supabase.from("friendships").delete().eq("id", friendshipId);
  }
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await supabase.from("friendships").delete().eq("id", friendshipId);
}

export interface FriendEdge {
  friendshipId: string;
  status: string;
  direction: "incoming" | "outgoing";
  profile: Profile;
}

export async function getFriends(userId: string): Promise<{
  accepted: FriendEdge[];
  incoming: FriendEdge[];
  outgoing: FriendEdge[];
}> {
  const { data } = await supabase
    .from("friendships")
    .select(
      `id, status, requester_id, addressee_id,
       requester:profiles!friendships_requester_id_fkey(*),
       addressee:profiles!friendships_addressee_id_fkey(*)`
    )
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const accepted: FriendEdge[] = [];
  const incoming: FriendEdge[] = [];
  const outgoing: FriendEdge[] = [];

  (data ?? []).forEach((row: any) => {
    const iAmRequester = row.requester_id === userId;
    const other = iAmRequester ? row.addressee : row.requester;
    const edge: FriendEdge = {
      friendshipId: row.id,
      status: row.status,
      direction: iAmRequester ? "outgoing" : "incoming",
      profile: other,
    };
    if (row.status === "accepted") accepted.push(edge);
    else if (row.status === "pending")
      iAmRequester ? outgoing.push(edge) : incoming.push(edge);
  });

  return { accepted, incoming, outgoing };
}

// ──────────────────────────── Tracker circle ───────────────────────────────

export async function getCircle(ownerId: string): Promise<string[]> {
  const { data } = await supabase
    .from("tracker_circle")
    .select("member_id")
    .eq("owner_id", ownerId);
  return (data ?? []).map((r) => r.member_id);
}

export async function setCircleMember(
  ownerId: string,
  memberId: string,
  include: boolean
): Promise<void> {
  if (include) {
    await supabase
      .from("tracker_circle")
      .upsert({ owner_id: ownerId, member_id: memberId });
    // Let them know they've been added.
    await supabase.from("notifications").insert({
      user_id: memberId,
      type: "added_to_circle",
      actor_id: ownerId,
      body: "added you to their tracker circle",
    });
  } else {
    await supabase
      .from("tracker_circle")
      .delete()
      .eq("owner_id", ownerId)
      .eq("member_id", memberId);
  }
}

// ────────────────────────────── Notifications ──────────────────────────────

export async function getNotifications(
  userId: string
): Promise<NotificationWithActor[]> {
  const { data } = await supabase
    .from("notifications")
    .select(`*, actor:profiles!notifications_actor_id_fkey(${authorCols})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as any;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return count ?? 0;
}

export async function markNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
}
