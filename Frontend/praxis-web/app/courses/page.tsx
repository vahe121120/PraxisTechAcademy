import type { Metadata } from "next";
import { BookX } from "lucide-react";
import { listCourses } from "@/lib/api/courses";
import type { Course, CourseTrack } from "@/lib/types";
import { CourseCard } from "@/components/course/CourseCard";
import { TrackFilter } from "@/components/course/TrackFilter";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Courses" };

interface CoursesPageProps {
  searchParams: Promise<{ track?: string }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const { track } = await searchParams;

  let courses: Course[] = [];
  let loadError = false;
  try {
    // `track` comes straight off the URL and is whatever the visitor typed
    // — the backend validates it against the real CourseTrack enum and
    // 400s on anything else, which the catch below turns into loadError.
    const result = await listCourses({ track: track as CourseTrack | undefined, limit: 50 });
    courses = result.data;
  } catch {
    loadError = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900-solid">Courses</h1>
          <p className="text-sm text-ink-500">Pick a track and see the next scheduled cohort.</p>
        </div>
        <TrackFilter current={track} />
      </div>

      {loadError ? (
        <EmptyState
          icon={BookX}
          title="Couldn't load courses"
          description="Please refresh the page — if this keeps happening, the API may be unreachable."
        />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookX}
          title="No courses match that filter"
          description="Try a different track."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
