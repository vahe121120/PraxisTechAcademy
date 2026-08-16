import type { LucideIcon } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-ink-500">{label}</p>
          <p className="text-xl font-semibold text-ink-900-solid">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}
