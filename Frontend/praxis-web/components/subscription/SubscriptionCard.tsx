"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { renewSubscription, cancelSubscription } from "@/lib/api/subscriptions";
import { ApiError } from "@/lib/api/http";
import { formatDate } from "@/lib/money";
import type { Subscription } from "@/lib/types";

interface SubscriptionCardProps {
  subscription: Subscription;
  onChange: (updated: Subscription) => void;
}

export function SubscriptionCard({ subscription, onChange }: SubscriptionCardProps) {
  const { callWithAuth } = useAuth();
  const [pendingAction, setPendingAction] = useState<"renew" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "renew" | "cancel") {
    setError(null);
    setPendingAction(action);
    try {
      const updated = await callWithAuth((token) =>
        action === "renew"
          ? renewSubscription(subscription.id, token)
          : cancelSubscription(subscription.id, token),
      );
      onChange(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't go through. Try again.");
    } finally {
      setPendingAction(null);
    }
  }

  const canRenew = subscription.status === "EXPIRED" || subscription.status === "CANCELLED";
  const canCancel = subscription.status === "ACTIVE" || subscription.status === "PENDING";

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-ink-900-solid">
              {subscription.courseTitle ?? "Course"}
            </p>
            <p className="text-sm text-ink-500">{subscription.courseGroupTitle}</p>
          </div>
          <StatusBadge status={subscription.status} />
        </div>
        {subscription.expiresAt && (
          <p className="text-sm text-ink-500">
            {subscription.status === "ACTIVE" ? "Renews" : "Expired"} on{" "}
            {formatDate(subscription.expiresAt)}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        {(canRenew || canCancel) && (
          <div className="flex gap-2">
            {canRenew && (
              <Button
                size="sm"
                variant="secondary"
                isLoading={pendingAction === "renew"}
                disabled={pendingAction !== null}
                onClick={() => handleAction("renew")}
              >
                Renew
              </Button>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                isLoading={pendingAction === "cancel"}
                disabled={pendingAction !== null}
                onClick={() => handleAction("cancel")}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
