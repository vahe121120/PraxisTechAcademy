"use client";

import { useRouter, useSearchParams } from "next/navigation";

const TRACKS = ["All", "QA Automation", "Backend", "Frontend", "DevOps"];

export function TrackFilter({ current }: { current?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectTrack(track: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (track === "All") {
      params.delete("track");
    } else {
      params.set("track", track);
    }
    router.push(`/courses${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter courses by track">
      {TRACKS.map((track) => {
        const isActive = track === "All" ? !current : current === track;
        return (
          <button
            key={track}
            type="button"
            onClick={() => selectTrack(track)}
            aria-pressed={isActive}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-700 border border-ink-100 hover:bg-ink-50"
            }`}
          >
            {track}
          </button>
        );
      })}
    </div>
  );
}
