import { Calendar, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { PurchaseButton } from "@/components/payment/PurchaseButton";
import { formatDate } from "@/lib/money";
import type { CourseGroup } from "@/lib/types";

export function CourseGroupRow({ group }: { group: CourseGroup }) {
  // The API does not expose a live enrollment count for a course group, so
  // "seats left" can't be computed client-side — only capacity itself is
  // known. Purchasability is based on status alone: a group still in
  // UPCOMING is open for enrollment; once it's ACTIVE, COMPLETED, or
  // CANCELLED it's no longer something a new student can buy into here.
  const isPurchasable = group.status === "UPCOMING";

  return (
    <div className="flex flex-col gap-3 rounded-[--radius-card] border border-ink-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-ink-900-solid">{group.name}</span>
          <StatusBadge status={group.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {formatDate(group.startDate)}
            {group.endDate ? ` – ${formatDate(group.endDate)}` : ""}
          </span>
          {group.capacity !== null && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" aria-hidden="true" />
              {group.capacity} seats
            </span>
          )}
        </div>
      </div>
      <PurchaseButton courseGroupId={group.id} disabled={!isPurchasable} />
    </div>
  );
}
