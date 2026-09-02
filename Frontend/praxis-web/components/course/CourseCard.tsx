import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import type { Course } from "@/lib/types";

export function CourseCard({ course }: { course: Course }) {
  const href = `/courses/${course.slug || course.id}`;

  return (
    <Link href={href} className="group block focus-visible:outline-none">
      <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-brand-300 group-hover:shadow-md">
        <CardBody className="flex h-full flex-col justify-between gap-4 p-5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Badge tone="brand">{course.track}</Badge>
                {course.level && (
                  <span className="rounded-full bg-ink-50 px-2 py-0.5 text-xs font-medium text-ink-500">
                    {course.level}
                  </span>
                )}
              </div>
              <ArrowUpRight
                className="h-4 w-4 text-ink-300 transition-colors group-hover:text-brand-600"
                aria-hidden="true"
              />
            </div>

            <h3 className="text-lg font-semibold text-ink-900-solid group-hover:text-brand-700 transition-colors">
              {course.title}
            </h3>

            <p className="line-clamp-2 text-sm text-ink-500">
              {course.shortDescription || (course.description ? course.description.split("\n")[0] : "")}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-sm">
            <span className="flex items-center gap-1.5 text-ink-500">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {course.durationDays} days
            </span>
            <div className="text-right">
              <span className="font-semibold text-ink-900-solid">
                {formatMoney(course.monthlyPrice, course.currency)}
              </span>
              <span className="text-xs text-ink-500"> / mo</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
