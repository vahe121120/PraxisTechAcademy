"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldOff, ShieldCheck, Mail, Phone, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getStudent,
  getStudentPayments,
  getStudentSubscriptions,
  suspendStudent,
  reactivateStudent,
  activateSubscription,
  deactivateSubscription,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/http";
import type { Payment, SafeUser, Subscription } from "@/lib/types";
import { formatDate, formatDateTime, formatMoney } from "@/lib/money";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";

type Tab = "payments" | "subscriptions";

interface StudentDetailProps {
  studentId: string;
  /** Called after suspend/reactivate so the parent list can reflect it. */
  onStudentChanged?: () => void;
}

export function StudentDetail({ studentId, onStudentChanged }: StudentDetailProps) {
  const { callWithAuth } = useAuth();
  const [student, setStudent] = useState<SafeUser | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [studentResult, paymentsResult, subscriptionsResult] = await Promise.all([
        callWithAuth((token) => getStudent(studentId, token)),
        callWithAuth((token) => getStudentPayments(studentId, token)),
        callWithAuth((token) => getStudentSubscriptions(studentId, token)),
      ]);
      setStudent(studentResult);
      setPayments(paymentsResult);
      setSubscriptions(subscriptionsResult);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this student.");
    } finally {
      setIsLoading(false);
    }
  }, [callWithAuth, studentId]);

  useEffect(() => {
    // Resetting local UI state and kicking off the fetch for the newly
    // selected student — the sanctioned "sync on prop change" pattern;
    // `load`'s own setState calls all happen after an awaited call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfirmingSuspend(false);
    setMutationError(null);
    load();
  }, [load]);

  async function handleSuspendToggle() {
    if (!student) return;
    setMutationError(null);
    setIsMutating(true);
    try {
      const updated = student.isSuspended
        ? await callWithAuth((token) => reactivateStudent(student.id, token))
        : await callWithAuth((token) => suspendStudent(student.id, token));
      setStudent(updated);
      setConfirmingSuspend(false);
      onStudentChanged?.();
    } catch (err) {
      setMutationError(err instanceof ApiError ? err.message : "That action didn't go through.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleSubscriptionToggle(subscription: Subscription) {
    setMutationError(null);
    setIsMutating(true);
    try {
      const updated =
        subscription.status === "ACTIVE"
          ? await callWithAuth((token) => deactivateSubscription(subscription.id, token))
          : await callWithAuth((token) => activateSubscription(subscription.id, token));
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setMutationError(err instanceof ApiError ? err.message : "That action didn't go through.");
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) return <PageSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!student) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink-900-solid">{student.fullName}</h2>
              {student.isSuspended && <Badge tone="danger">Suspended</Badge>}
              {student.telegramLinked && (
                <span title="Telegram linked">
                  <Send className="h-4 w-4 text-signal-500" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-col gap-1 text-sm text-ink-500 sm:flex-row sm:gap-4">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {student.email}
              </span>
              {student.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {student.phone}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-300">Joined {formatDate(student.createdAt)}</p>
          </div>

          {!confirmingSuspend ? (
            <Button
              variant={student.isSuspended ? "secondary" : "danger"}
              size="sm"
              onClick={() => (student.isSuspended ? handleSuspendToggle() : setConfirmingSuspend(true))}
              isLoading={isMutating && !confirmingSuspend}
            >
              {student.isSuspended ? (
                <>
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Reactivate
                </>
              ) : (
                <>
                  <ShieldOff className="h-4 w-4" aria-hidden="true" />
                  Suspend
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-danger-50 px-3 py-2">
              <span className="text-sm text-danger-600">Suspend this student?</span>
              <Button size="sm" variant="danger" isLoading={isMutating} onClick={handleSuspendToggle}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingSuspend(false)}>
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
      </Card>

      {mutationError && (
        <p role="alert" className="text-sm text-danger-600">
          {mutationError}
        </p>
      )}

      <div className="flex gap-1 border-b border-ink-100" role="tablist">
        <TabButton active={tab === "subscriptions"} onClick={() => setTab("subscriptions")}>
          Subscriptions ({subscriptions.length})
        </TabButton>
        <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
          Payments ({payments.length})
        </TabButton>
      </div>

      {tab === "subscriptions" ? (
        subscriptions.length === 0 ? (
          <EmptyState title="No subscriptions" description="This student hasn't enrolled in anything yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {subscriptions.map((sub) => (
              <Card key={sub.id}>
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink-900-solid">
                      {sub.courseTitle ?? sub.courseId} — {sub.courseGroupTitle ?? sub.courseGroupId}
                    </p>
                    <p className="text-sm text-ink-500">
                      {sub.expiresAt ? `Expires ${formatDate(sub.expiresAt)}` : "No expiry set"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={sub.status} />
                    {(sub.status === "ACTIVE" || sub.status === "EXPIRED" || sub.status === "PENDING") && (
                      <Button
                        size="sm"
                        variant={sub.status === "ACTIVE" ? "secondary" : "primary"}
                        disabled={isMutating}
                        onClick={() => handleSubscriptionToggle(sub)}
                      >
                        {sub.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )
      ) : payments.length === 0 ? (
        <EmptyState title="No payments" description="This student hasn't made any payments yet." />
      ) : (
        <div className="overflow-hidden rounded-[--radius-card] border border-ink-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-ink-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Provider</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-2.5 text-ink-500">{formatDateTime(payment.createdAt)}</td>
                  <td className="px-4 py-2.5 font-medium text-ink-900-solid">
                    {formatMoney(payment.amountMinor, payment.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-ink-500">{payment.provider}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={payment.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-700"
      }`}
    >
      {children}
    </button>
  );
}
