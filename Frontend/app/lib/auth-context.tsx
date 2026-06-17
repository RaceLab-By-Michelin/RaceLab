"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "./api";
import type { UserOut } from "./api";

interface AuthContextValue {
  user: UserOut | null;
  /** true tant que la vérification initiale du jeton de session n'est pas terminée */
  loading: boolean;
  /** Recharge l'utilisateur courant depuis /auth/me (ou le vide si non authentifié) */
  refresh: () => Promise<void>;
  setUser: (u: UserOut | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authApi.hasToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  return ctx;
}
