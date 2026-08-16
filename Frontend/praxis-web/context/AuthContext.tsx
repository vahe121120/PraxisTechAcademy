"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/http";
import type { SafeUser } from "@/lib/types";

interface AuthContextValue {
  user: SafeUser | null;
  accessToken: string | null;
  /** True until the initial silent-refresh-on-mount attempt resolves. */
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<SafeUser>;
  register: (payload: authApi.RegisterPayload) => Promise<SafeUser>;
  logout: () => Promise<void>;
  /**
   * Every authenticated API call in the app should go through this rather
   * than calling accessToken directly. It retries once on a 401 by
   * attempting a silent refresh, so a genuinely-expired-but-refreshable
   * session never surfaces as an error to the user.
   */
  callWithAuth: <T,>(fn: (accessToken: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  // Access token is deliberately never in localStorage or a client-readable
  // cookie — only in memory, matching the backend's own security posture.
  // The ref mirrors state so callWithAuth can read the latest token
  // synchronously without becoming a dependency of every caller.
  const tokenRef = useRef<string | null>(null);

  const setToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setAccessToken(token);
  }, []);

  const silentRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const { accessToken: newToken } = await authApi.refresh();
      setToken(newToken);
      const freshUser = await authApi.me(newToken);
      setUser(freshUser);
      return newToken;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    }
  }, [setToken]);

  useEffect(() => {
    // Sanctioned "sync with an external system (the refresh cookie) on
    // mount" pattern — setIsInitializing(false) runs in a .finally after
    // the awaited refresh call, never synchronously in this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    silentRefresh().finally(() => setIsInitializing(false));
    // Intentionally run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login({ email, password });
      setToken(result.accessToken);
      setUser(result.user);
      return result.user;
    },
    [setToken],
  );

  const registerUser = useCallback(
    async (payload: authApi.RegisterPayload) => {
      const result = await authApi.register(payload);
      setToken(result.accessToken);
      setUser(result.user);
      return result.user;
    },
    [setToken],
  );

  const logout = useCallback(async () => {
    const current = tokenRef.current;
    setToken(null);
    setUser(null);
    if (current) {
      try {
        await authApi.logout(current);
      } catch {
        // Best-effort — the client-side session is already cleared, and the
        // refresh cookie will simply fail on next use if this didn't land.
      }
    }
  }, [setToken]);

  const callWithAuth = useCallback(
    async <T,>(fn: (accessToken: string) => Promise<T>): Promise<T> => {
      let token = tokenRef.current;
      if (!token) {
        token = await silentRefresh();
      }
      if (!token) {
        throw new ApiError(401, null, "Your session has expired. Please log in again.");
      }
      try {
        return await fn(token);
      } catch (err) {
        if (err instanceof ApiError && err.isUnauthorized) {
          const refreshed = await silentRefresh();
          if (!refreshed) throw err;
          return fn(refreshed);
        }
        throw err;
      }
    },
    [silentRefresh],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isInitializing,
        login,
        register: registerUser,
        logout,
        callWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
