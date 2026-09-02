import type { Metadata } from "next";
import { BookX } from "lucide-react";
import { listCoursesWithFallback } from "@/lib/api/courses";
import type { Course, CourseTrack } from "@/lib/types";
import { CourseCard } from "@/components/course/CourseCard";
import { TrackFilter } from "@/components/course/TrackFilter";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Explore instructor-led IT courses at Praxis Tech Academy — QA Automation, Backend Engineering, Python, JavaScript, and more.",
};

interface CoursesPageProps {
  searchParams: Promise<{ track?: string }>;
}

const VALID_TRACKS: CourseTrack[] = ["FUNDAMENTALS", "PROFESSION", "COMBINED", "MINI"];

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const { track } = await searchParams;
  const validTrack =
    track && VALID_TRACKS.includes(track as CourseTrack)
      ? (track as CourseTrack)
      : undefined;

  let courses: Course[] = [];
  try {
    courses = await listCoursesWithFallback({ track: validTrack, limit: 50 });
  } catch {
    courses = [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900-solid sm:text-3xl">
            Explore Courses
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Cohort-based programs taught by senior engineers with live mentoring and career guidance.
          </p>
        </div>
        <TrackFilter current={validTrack} />
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookX}
          title="No courses match that filter"
          description="Try selecting a different track or browse all available programs."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.slug || course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
