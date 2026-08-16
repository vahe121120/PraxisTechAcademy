"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { createOrder } from "@/lib/api/orders";
import { initiatePayment } from "@/lib/api/payments";
import { ApiError } from "@/lib/api/http";

interface PurchaseButtonProps {
  courseGroupId: string;
  disabled?: boolean;
}

export function PurchaseButton({ courseGroupId, disabled }: PurchaseButtonProps) {
  const { user, callWithAuth } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase() {
    if (!user) {
      router.push(`/register?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const order = await callWithAuth((token) => createOrder({ courseGroupId }, token));
      const { redirectUrl } = await callWithAuth((token) => initiatePayment(order.id, token));
      // The order id is carried via sessionStorage because the backend's
      // ARCA_RETURN_URL is a single fixed URL, not per-order.
      sessionStorage.setItem("praxis:pendingOrderId", order.id);
      window.location.href = redirectUrl;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't start checkout. Please try again in a moment.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={handlePurchase} disabled={disabled} isLoading={isLoading}>
        <CreditCard className="h-4 w-4" aria-hidden="true" />
        {disabled ? "Not available" : "Enroll & pay"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
