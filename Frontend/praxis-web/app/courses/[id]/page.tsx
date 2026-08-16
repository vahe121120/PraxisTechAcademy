import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Layers } from "lucide-react";
import { getCourse } from "@/lib/api/courses";
import { listCourseGroups } from "@/lib/api/course-groups";
import { ApiError } from "@/lib/api/http";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseGroupRow } from "@/components/course/CourseGroupRow";
import { formatMoney } from "@/lib/money";

interface CourseDetailPageProps {
  params: Promise<{ id: string }>;
}

async function loadCourse(id: string) {
  try {
    return await getCourse(id);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) {
      notFound();
    }
    throw err;
  }
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const course = await getCourse(id);
    return { title: course.title, description: course.summary };
  } catch {
    return { title: "Course" };
  }
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params;
  const course = await loadCourse(id);
  const groups = await listCourseGroups({ courseId: course.id }).catch(() => []);

  const upcomingGroups = groups.filter((g) => g.status !== "COMPLETED" && g.status !== "CANCELLED");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Badge tone="brand">{course.track}</Badge>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink-900-solid">
        {course.title}
      </h1>
      <p className="mt-3 text-lg text-ink-500">{course.summary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-500">
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" aria-hidden="true" />
          {course.durationWeeks} weeks
        </span>
        <span className="flex items-center gap-1.5">
          <Layers className="h-4 w-4" aria-hidden="true" />
          {formatMoney(course.priceMinor, course.currency)}
        </span>
      </div>

      <div className="mt-8 whitespace-pre-line text-ink-700">{course.description}</div>

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-ink-900-solid">Upcoming cohorts</h2>
        {upcomingGroups.length === 0 ? (
          <EmptyState
            title="No cohorts scheduled right now"
            description="Check back soon, or contact us to be notified when the next one opens."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingGroups.map((group) => (
              <CourseGroupRow key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
