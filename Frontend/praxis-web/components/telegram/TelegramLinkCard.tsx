"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { getTelegramLinkStatus, requestTelegramLink } from "@/lib/api/telegram";
import { ApiError } from "@/lib/api/http";

export function TelegramLinkCard() {
  const { user, callWithAuth } = useAuth();
  const [isLinked, setIsLinked] = useState<boolean | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const { linked } = await callWithAuth((token) => getTelegramLinkStatus(token));
      setIsLinked(linked);
    } catch {
      // Non-critical — the card just shows the "connect" state until this
      // succeeds on a future render/retry.
      setIsLinked(false);
    }
  }, [callWithAuth]);

  useEffect(() => {
    // Sanctioned "fetch from an external system on mount" pattern — the
    // setState above only ever runs after the awaited call resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStatus();
  }, [loadStatus]);

  async function handleConnect() {
    setError(null);
    setIsConnecting(true);
    try {
      const { deepLink } = await callWithAuth((token) => requestTelegramLink(token));
      window.open(deepLink, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't get a Telegram link. Try again.",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  if (!user) return null;

  return (
    <Card>
      <CardBody className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-500/10">
            <Send className="h-5 w-5 text-signal-500" aria-hidden="true" />
          </div>
          <div>
            <p className="font-medium text-ink-900-solid">Telegram cohort access</p>
            <p className="text-sm text-ink-500">
              {isLinked
                ? "Your account is linked."
                : "Connect Telegram to join your cohort's group."}
            </p>
          </div>
        </div>
        {isLinked === null ? (
          <Spinner className="h-5 w-5 text-ink-300" />
        ) : isLinked ? (
          <CheckCircle2 className="h-6 w-6 text-success-500" aria-hidden="true" />
        ) : (
          <Button size="sm" onClick={handleConnect} isLoading={isConnecting}>
            Connect Telegram
          </Button>
        )}
      </CardBody>
      {error && (
        <p role="alert" className="px-5 pb-4 text-sm text-danger-600">
          {error}
        </p>
      )}
    </Card>
  );
}
