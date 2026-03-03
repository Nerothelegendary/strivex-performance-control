import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
  loading: boolean;
  subscription: SubscriptionState;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  loading: true,
  subscription: { subscribed: false, productId: null, subscriptionEnd: null, loading: true },
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshSubscription: async () => {},
});

export const useAuth = () => useContext(AuthContext);

async function fetchUserData(userId: string) {
  const [roleRes, profileRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle(),
    supabase.from("profiles").select("full_name, avatar_url").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    role: roleRes.data?.role ?? null,
    profile: profileRes.data ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("check-subscription error:", error);
        setSubscription((s) => ({ ...s, loading: false }));
        return;
      }
      setSubscription({
        subscribed: data.subscribed ?? false,
        productId: data.product_id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        loading: false,
      });
    } catch {
      setSubscription((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            if (!isMounted) return;
            const data = await fetchUserData(session.user.id);
            if (isMounted) {
              setRole(data.role);
              setProfile(data.profile);
            }
          }, 0);
          // Check subscription on auth change
          setTimeout(() => { if (isMounted) checkSubscription(); }, 100);
        } else {
          setRole(null);
          setProfile(null);
          setSubscription({ subscribed: false, productId: null, subscriptionEnd: null, loading: false });
        }
      }
    );

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const data = await fetchUserData(session.user.id);
          if (isMounted) {
            setRole(data.role);
            setProfile(data.profile);
          }
          checkSubscription();
        } else {
          setSubscription((s) => ({ ...s, loading: false }));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    // Refresh subscription every 60 seconds
    const interval = setInterval(() => {
      if (isMounted) checkSubscription();
    }, 60_000);

    return () => {
      isMounted = false;
      authSub.unsubscribe();
      clearInterval(interval);
    };
  }, [checkSubscription]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setProfile(null);
    setSubscription({ subscribed: false, productId: null, subscriptionEnd: null, loading: false });
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setProfile(data);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        profile,
        loading,
        subscription,
        signOut,
        refreshProfile,
        refreshSubscription: checkSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
