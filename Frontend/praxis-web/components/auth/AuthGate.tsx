"use client";

// Deliberately client-side rather than Next.js middleware: the access token
// lives only in memory (never in a cookie), so there is nothing for
// middleware — which runs at the edge, before any client JS — to read.
// Middleware could inspect the refresh cookie's mere presence, but that
// only proves a refresh token exists, not that the caller is currently
// authorized for this role; the real check has to happen once the client
// has exchanged that cookie for a verified user via AuthContext.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/lib/types";
import { PageSpinner } from "@/components/ui/Spinner";

interface AuthGateProps {
  children: React.ReactNode;
  /** If provided, the signed-in user's role must be in this list. */
  allow?: Role[];
  redirectTo?: string;
}

export function AuthGate({ children, allow, redirectTo = "/login" }: AuthGateProps) {
  const { user, isInitializing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isInitializing) return;
    if (!user) {
      router.replace(redirectTo);
      return;
    }
    if (allow && !allow.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [isInitializing, user, allow, redirectTo, router]);

  if (isInitializing || !user || (allow && !allow.includes(user.role))) {
    return <PageSpinner />;
  }

  return <>{children}</>;
}
