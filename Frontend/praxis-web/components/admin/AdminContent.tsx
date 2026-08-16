"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, CreditCard, TrendingUp, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDashboardStats } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import type { DashboardStats } from "@/lib/types";
import { formatMoney } from "@/lib/money";
import { StatCard } from "@/components/admin/StatCard";
import { StudentSearch } from "@/components/admin/StudentSearch";
import { StudentDetail } from "@/components/admin/StudentDetail";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";

export function AdminContent() {
  const { callWithAuth } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  // Bumped after a suspend/reactivate so the search results list (which
  // shows a "Suspended" badge) reflects the change without a full remount.
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    callWithAuth((token) => getDashboardStats(token))
      .then(setStats)
      .catch((err) => setStatsError(err instanceof ApiError ? err.message : "Couldn't load stats."));
  }, [callWithAuth]);

  const handleStudentChanged = useCallback(() => {
    setListRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900-solid">Admin</h1>
        <p className="text-sm text-ink-500">Students, payments, and subscriptions.</p>
      </div>

      {statsError ? (
        <ErrorState message={statsError} />
      ) : !stats ? (
        <div className="flex justify-center py-6">
          <Spinner className="h-5 w-5 text-brand-500" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total students" value={stats.totalStudents.toLocaleString()} icon={Users} />
          <StatCard
            label="Active subscriptions"
            value={stats.activeSubscriptions.toLocaleString()}
            icon={TrendingUp}
          />
          <StatCard label="Pending orders" value={stats.pendingOrders.toLocaleString()} icon={Clock} />
          <StatCard
            label="Revenue this month"
            value={formatMoney(stats.revenueMinorThisMonth, stats.currency)}
            icon={CreditCard}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <div>
          <h2 className="mb-3 text-sm font-medium text-ink-700">Students</h2>
          <StudentSearch
            selectedId={selectedStudentId}
            onSelect={setSelectedStudentId}
            refreshKey={listRefreshKey}
          />
        </div>
        <div>
          {selectedStudentId ? (
            <StudentDetail studentId={selectedStudentId} onStudentChanged={handleStudentChanged} />
          ) : (
            <EmptyState
              icon={Users}
              title="Select a student"
              description="Search for a student on the left to view their payments and subscriptions."
            />
          )}
        </div>
      </div>
    </div>
  );
}
