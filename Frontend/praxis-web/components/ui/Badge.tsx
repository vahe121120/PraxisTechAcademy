type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-50 text-ink-700",
  success: "bg-success-50 text-success-500",
  warning: "bg-warning-50 text-warning-500",
  danger: "bg-danger-50 text-danger-600",
  brand: "bg-brand-50 text-brand-700",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success",
  PUBLISHED: "success",
  PAID: "success",
  SUCCEEDED: "success",
  PENDING: "warning",
  INITIATED: "warning",
  UPCOMING: "brand",
  DRAFT: "neutral",
  EXPIRED: "danger",
  FAILED: "danger",
  CANCELLED: "danger",
  ARCHIVED: "neutral",
  COMPLETED: "neutral",
  REFUNDED: "neutral",
  SUSPENDED: "danger",
  DELETED: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Badge>;
}
