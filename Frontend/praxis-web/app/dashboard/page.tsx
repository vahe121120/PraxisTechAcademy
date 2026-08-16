import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { DashboardContent } from "./DashboardContent";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <AuthGate>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <DashboardContent />
      </div>
    </AuthGate>
  );
}
