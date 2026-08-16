import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { AdminContent } from "@/components/admin/AdminContent";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <AuthGate allow={["ADMIN"]}>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <AdminContent />
      </div>
    </AuthGate>
  );
}
