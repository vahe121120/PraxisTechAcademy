import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import type { Course } from "@/lib/types";

export function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/courses/${course.id}`} className="group block">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardBody className="flex h-full flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <Badge tone="brand">{course.track}</Badge>
            <ArrowUpRight
              className="h-4 w-4 text-ink-300 transition-colors group-hover:text-brand-500"
              aria-hidden="true"
            />
          </div>
          <h3 className="text-lg font-semibold text-ink-900-solid">{course.title}</h3>
          <p className="line-clamp-2 flex-1 text-sm text-ink-500">{course.description}</p>
          <div className="flex items-center justify-between border-t border-ink-100 pt-3">
            <span className="flex items-center gap-1.5 text-sm text-ink-500">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {course.durationDays} days
            </span>
            <span className="font-semibold text-ink-900-solid">
              {formatMoney(course.monthlyPrice, course.currency)}
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
