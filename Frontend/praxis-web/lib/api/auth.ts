import { request } from "@/lib/api/http";
import type { SafeUser, TokenPair } from "@/lib/types";

export interface RegisterPayload {
  email: string;
  password: string;
  fullName?: string;
  name?: string;
  phone: string;
  telegramUsername?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult extends TokenPair {
  user: SafeUser;
}

// The refresh token itself is never touched here — it lives in an
// httpOnly cookie set by the backend and is never readable client-side.
// `credentials: "include"` (the http.ts default) is what carries it.

export function register(payload: RegisterPayload) {
  const { fullName, name, ...rest } = payload;
  return request<AuthResult>("/auth/register", {
    method: "POST",
    body: {
      ...rest,
      name: (name ?? fullName)?.trim(),
    },
  });
}

export function login(payload: LoginPayload) {
  return request<AuthResult>("/auth/login", { method: "POST", body: payload });
}

export function refresh() {
  return request<TokenPair>("/auth/refresh", { method: "POST" });
}

export function logout(accessToken: string) {
  return request<void>("/auth/logout", { method: "POST", accessToken });
}

export function me(accessToken: string) {
  return request<SafeUser>("/auth/me", { accessToken });
}
