/**
 * Hand-written types that mirror supabase/schema.sql.
 * If you change the schema, run `supabase gen types typescript` to regenerate,
 * or keep this in sync by hand.
 */

export type FriendshipStatus = "pending" | "accepted" | "blocked";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "new_log"
  | "like"
  | "comment"
  | "added_to_circle";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  daily_calorie_goal: number;
  protein_goal_g: number;
  carbs_goal_g: number;
  fat_goal_g: number;
  streak_count: number;
  expo_push_token: string | null;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
}

export interface TrackerCircle {
  owner_id: string;
  member_id: string;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  meal_name: string;
  serving_size: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  photo_url: string | null;
  ai_confidence: number | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
}

export interface LogLike {
  id: string;
  log_id: string;
  user_id: string;
  created_at: string;
}

export interface LogComment {
  id: string;
  log_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  log_id: string | null;
  body: string;
  read: boolean;
  created_at: string;
}

/** Minimal shape used by supabase-js generics. */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      friendships: {
        Row: Friendship;
        Insert: Partial<Friendship>;
        Update: Partial<Friendship>;
      };
      tracker_circle: {
        Row: TrackerCircle;
        Insert: Partial<TrackerCircle>;
        Update: Partial<TrackerCircle>;
      };
      food_logs: { Row: FoodLog; Insert: Partial<FoodLog>; Update: Partial<FoodLog> };
      log_likes: { Row: LogLike; Insert: Partial<LogLike>; Update: Partial<LogLike> };
      log_comments: {
        Row: LogComment;
        Insert: Partial<LogComment>;
        Update: Partial<LogComment>;
      };
      notifications: {
        Row: AppNotification;
        Insert: Partial<AppNotification>;
        Update: Partial<AppNotification>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

/** Joined shapes returned by our feed/detail queries. */
export type FoodLogWithAuthor = FoodLog & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

export type CommentWithAuthor = LogComment & {
  author: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
};

export type NotificationWithActor = AppNotification & {
  actor: Pick<Profile, "id" | "username" | "display_name" | "avatar_url"> | null;
};
