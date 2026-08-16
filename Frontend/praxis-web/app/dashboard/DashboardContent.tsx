"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { listMySubscriptions } from "@/lib/api/subscriptions";
import { listMyOrders } from "@/lib/api/orders";
import { listCourses } from "@/lib/api/courses";
import { listCourseGroups } from "@/lib/api/course-groups";
import { ApiError } from "@/lib/api/http";
import type { Subscription, Order } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/money";
import { TelegramLinkCard } from "@/components/telegram/TelegramLinkCard";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageSpinner } from "@/components/ui/Spinner";

export function DashboardContent() {
  const { user, callWithAuth } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [subs, myOrders, courseList, groupList] = await Promise.all([
        callWithAuth((token) => listMySubscriptions(token)),
        callWithAuth((token) => listMyOrders(token)),
        listCourses({ pageSize: 100 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 100 })),
        listCourseGroups().catch(() => []),
      ]);

      // Enrich subscriptions with course/group titles via client-side
      // lookups, per the established pattern — the subscription response
      // itself only carries ids.
      const courseTitleById = new Map(courseList.items.map((c) => [c.id, c.title]));
      const groupTitleById = new Map(groupList.map((g) => [g.id, g.title]));

      setSubscriptions(
        subs.map((s) => ({
          ...s,
          courseTitle: courseTitleById.get(s.courseId),
          courseGroupTitle: groupTitleById.get(s.courseGroupId),
        })),
      );
      setOrders(myOrders);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load your dashboard.");
    }
  }, [callWithAuth]);

  useEffect(() => {
    // Sanctioned "fetch from an external system on mount" pattern — every
    // setState inside `load` happens after an awaited API call, never
    // synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function updateSubscription(updated: Subscription) {
    setSubscriptions((prev) => (prev ? prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)) : prev));
  }

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (subscriptions === null || orders === null) return <PageSpinner />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900-solid">
          Welcome back, {user?.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-ink-500">Your subscriptions, payments, and Telegram access.</p>
      </div>

      <TelegramLinkCard />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink-900-solid">Your subscriptions</h2>
        {subscriptions.length === 0 ? (
          <EmptyState
            title="No subscriptions yet"
            description="Enroll in a course to see it here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subscriptions.map((sub) => (
              <SubscriptionCard key={sub.id} subscription={sub} onChange={updateSubscription} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink-900-solid">Payment history</h2>
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" description="Your order history will show up here." />
        ) : (
          <Card>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left text-ink-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Amount</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-2.5 text-ink-500">{formatDateTime(order.createdAt)}</td>
                      <td className="px-4 py-2.5 font-medium text-ink-900-solid">
                        {formatMoney(order.amountMinor, order.currency)}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}
