import { CheckCircle2, Target } from "lucide-react";

interface CourseLearningOutcomesProps {
  outcomes: string[];
}

export function CourseLearningOutcomes({ outcomes }: CourseLearningOutcomesProps) {
  if (!outcomes || outcomes.length === 0) return null;

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
      <div className="flex items-center gap-2 text-brand-700">
        <Target className="h-5 w-5" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight text-ink-900-solid sm:text-2xl">
          What You Will Learn
        </h2>
      </div>
      <p className="mt-2 text-sm text-ink-500">
        Practical, industry-aligned skills you will be able to apply on the job upon graduation.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {outcomes.map((outcome, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 rounded-xl border border-ink-100/70 bg-ink-50/40 p-3.5 transition-colors hover:border-brand-300 hover:bg-white"
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-medium leading-relaxed text-ink-700">
              {outcome}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
