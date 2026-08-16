import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-[--radius-card] border border-danger-100 bg-danger-50 px-6 py-10 text-center"
    >
      <AlertTriangle className="h-6 w-6 text-danger-500" aria-hidden="true" />
      <p className="text-sm text-danger-600">
        {message ?? "Something went wrong loading this. Try again."}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
