import { Info } from "lucide-react";
import type { Course } from "@/lib/types";

interface CourseAboutProps {
  course: Course;
}

export function CourseAbout({ course }: CourseAboutProps) {
  // Split paragraphs if there are multiple lines
  const paragraphs = course.description
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
      <div className="flex items-center gap-2 text-brand-700">
        <Info className="h-5 w-5" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight text-ink-900-solid sm:text-2xl">
          About the Course
        </h2>
      </div>

      <div className="mt-4 space-y-4 text-base leading-relaxed text-ink-700">
        {paragraphs.map((para, idx) => (
          <p key={idx} className="whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>
    </section>
  );
}
