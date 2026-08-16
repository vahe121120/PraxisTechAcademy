"use client";

import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { requestTelegramLink } from "@/lib/api/telegram";
import { ApiError } from "@/lib/api/http";

export function TelegramLinkCard() {
  const { user, callWithAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    setIsLoading(true);
    try {
      const { deepLink } = await callWithAuth((token) => requestTelegramLink(token));
      window.open(deepLink, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't get a Telegram link. Try again.",
      );
    } finally {
      setIsLoading(false);
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
              {user.telegramLinked
                ? "Your account is linked."
                : "Connect Telegram to join your cohort's group."}
            </p>
          </div>
        </div>
        {user.telegramLinked ? (
          <CheckCircle2 className="h-6 w-6 text-success-500" aria-hidden="true" />
        ) : (
          <Button size="sm" onClick={handleConnect} isLoading={isLoading}>
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
