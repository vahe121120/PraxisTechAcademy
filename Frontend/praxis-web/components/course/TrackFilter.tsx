"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CourseTrack } from "@/lib/types";

// Values must be exactly the backend's CourseTrack enum — QueryCoursesDto
// validates `track` with `forbidNonWhitelisted: true`, so anything else
// (e.g. a human label like "QA Automation") gets the whole request
// rejected with a 400. Labels are the display text; values are what's sent.
const TRACKS: { value: CourseTrack | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "FUNDAMENTALS", label: "Fundamentals" },
  { value: "PROFESSION", label: "Profession" },
  { value: "COMBINED", label: "Combined" },
  { value: "MINI", label: "Mini course" },
];

export function TrackFilter({ current }: { current?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectTrack(track: CourseTrack | "ALL") {
    const params = new URLSearchParams(searchParams.toString());
    if (track === "ALL") {
      params.delete("track");
    } else {
      params.set("track", track);
    }
    router.push(`/courses${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter courses by track">
      {TRACKS.map(({ value, label }) => {
        const isActive = value === "ALL" ? !current : current === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => selectTrack(value)}
            aria-pressed={isActive}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-700 border border-ink-100 hover:bg-ink-50"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
