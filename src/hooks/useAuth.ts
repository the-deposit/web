"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/supabase/types";

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lazy import to avoid SSR Supabase initialization errors
    const { createClient } = require("@/lib/supabase/client");
    const supabase = createClient();

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(profile);
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: { user: User } | null) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setProfile(profile);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { createClient } = require("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    const { createClient } = require("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === "admin";
  const isVendedor = profile?.role === "vendedor" || isAdmin;
  const isCliente = profile?.role === "cliente";

  return {
    user,
    profile,
    loading,
    signInWithGoogle,
    signOut,
    isAdmin,
    isVendedor,
    isCliente,
  };
}
