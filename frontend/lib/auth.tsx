"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, login as requestLogin, tokens } from "./api";
import { HOME_FOR_ROLE } from "./roles";
import type { Me } from "./types";

interface AuthState {
  user: Me | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<Me>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const ENABLED_ROLES = new Set(["saasadmin", "admin", "teacher", "accountant"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!tokens.access) {
      setLoading(false);
      return;
    }
    api
      .get<Me>("/auth/me/")
      .then((profile) => {
        if (ENABLED_ROLES.has(profile.role)) setUser(profile);
        else tokens.clear();
      })
      .catch(() => tokens.clear())
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const profile = (await requestLogin(username, password)) as Me;
    if (!ENABLED_ROLES.has(profile.role)) {
      tokens.clear();
      throw new Error("Parent and student access is not enabled yet.");
    }
    const me = profile ?? (await api.get<Me>("/auth/me/"));
    setUser(me);
    return me;
  }, []);

  const signOut = useCallback(() => {
    tokens.clear();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function homeFor(user: Me | null) {
  if (!user) return "/login";
  if (user.role === "parent" || user.role === "student") return "/login";
  if (user.role === "saasadmin") {
    return user.institution ? "/dashboard" : "/school-setup";
  }
  if (user.role === "admin") return "/dashboard";
  if (!user.institution) {
    return "/school-setup";
  }
  return HOME_FOR_ROLE[user.role] ?? "/dashboard";
}
