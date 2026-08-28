"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getPaymentStatus } from "@/lib/api/payments";
import { ApiError } from "@/lib/api/http";
import { Button } from "@/components/ui/Button";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 60_000;

type PollState = "polling" | "paid" | "failed" | "timeout" | "missing-order";

export function PaymentReturnContent() {
  const { callWithAuth } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<PollState>("polling");
  // Initialized to null, not Date.now() — calling Date.now() during render
  // is an impure render call under React 19's stricter effect-purity
  // lint rules. The real timestamp is set inside the effect below.
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const orderId = sessionStorage.getItem("praxis:pendingOrderId");
    if (!orderId) {
      // Reacting to an external system (sessionStorage) read at mount —
      // the sanctioned case for a synchronous setState in an effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("missing-order");
      return;
    }

    startedAtRef.current = Date.now();
    let cancelled = false;
    let timeoutHandle: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const result = await callWithAuth((token) => getPaymentStatus(orderId!, token));
        if (cancelled) return;

        if (result.order.status === "PAID") {
          sessionStorage.removeItem("praxis:pendingOrderId");
          setState("paid");
          return;
        }
        // OrderStatus itself has no FAILED value — a failed attempt leaves
        // the Order PENDING (still retryable) unless it also expired or was
        // cancelled outright. A FAILED latest payment on a still-PENDING
        // order means this specific attempt didn't go through.
        if (
          result.order.status === "EXPIRED" ||
          result.order.status === "CANCELLED" ||
          result.latestPayment?.status === "FAILED"
        ) {
          setState("failed");
          return;
        }

        const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
        if (elapsed >= POLL_TIMEOUT_MS) {
          setState("timeout");
          return;
        }
        timeoutHandle = setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.isNotFound) {
          setState("failed");
          return;
        }
        const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
        if (elapsed >= POLL_TIMEOUT_MS) {
          setState("timeout");
          return;
        }
        timeoutHandle = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutHandle);
    };
  }, [callWithAuth]);

  useEffect(() => {
    if (state === "paid") {
      const redirect = setTimeout(() => router.push("/dashboard"), 2000);
      return () => clearTimeout(redirect);
    }
  }, [state, router]);

  if (state === "polling") {
    return (
      <>
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-ink-900-solid">Confirming your payment</h1>
        <p className="mt-2 text-sm text-ink-500">This usually takes a few seconds.</p>
      </>
    );
  }

  if (state === "paid") {
    return (
      <>
        <CheckCircle2 className="h-10 w-10 text-success-500" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-ink-900-solid">Payment confirmed</h1>
        <p className="mt-2 text-sm text-ink-500">Taking you to your dashboard…</p>
      </>
    );
  }

  if (state === "missing-order") {
    return (
      <>
        <XCircle className="h-10 w-10 text-ink-300" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold text-ink-900-solid">Nothing to confirm here</h1>
        <p className="mt-2 text-sm text-ink-500">
          We couldn&apos;t find a pending payment for this session.
        </p>
        <Link href="/dashboard" className="mt-6">
          <Button variant="secondary">Go to dashboard</Button>
        </Link>
      </>
    );
  }

  const isTimeout = state === "timeout";
  return (
    <>
      <XCircle className="h-10 w-10 text-danger-500" aria-hidden="true" />
      <h1 className="mt-4 text-xl font-semibold text-ink-900-solid">
        {isTimeout ? "Still confirming" : "Payment didn't go through"}
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        {isTimeout
          ? "This is taking longer than expected. Check your dashboard in a minute — it may still confirm."
          : "The payment wasn't completed. You can try again from the course page."}
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button variant="secondary">Go to dashboard</Button>
      </Link>
    </>
  );
}
