"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-semibold text-ink-900-solid">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-500">
            An unexpected error occurred. You can try again, or come back later.
          </p>
          <Button className="mt-6" onClick={reset}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
