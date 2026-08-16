import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Server-side fetches (SSR pages, route handlers) call the API directly.
  // Keep the base URL server-only where possible; NEXT_PUBLIC_API_URL exists
  // only because client components (PurchaseButton, AuthContext) also need it.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
