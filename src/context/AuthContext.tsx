import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/api";
import {
  registerForPushNotifications,
  addNotificationTapListener,
} from "@/lib/notifications";
import type { Profile } from "@/types/database";
import { router } from "expo-router";

interface AuthState {
  session: Session | null;
  user: Session["user"] | null;
  profile: Profile | null;
  loading: boolean;
  /** True once the profile for the current session has been fetched. */
  profileLoaded: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoaded(false);
    try {
      const p = await getProfile(userId);
      setProfile(p);
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      else setProfileLoaded(true);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) loadProfile(s.user.id);
      else {
        setProfile(null);
        setProfileLoaded(true);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Register push token + wire up tap-to-open once we have a user.
  useEffect(() => {
    if (!session?.user) return;
    registerForPushNotifications(session.user.id).catch(() => {});
    const listener = addNotificationTapListener((data) => {
      if (data?.log_id) router.push(`/log/${data.log_id}`);
      else router.push("/(tabs)/notifications");
    });
    return () => listener.remove();
  }, [session?.user?.id]);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    profileLoaded,
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
      setSession(null);
      setProfileLoaded(true);
      router.replace("/(auth)/sign-in");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
