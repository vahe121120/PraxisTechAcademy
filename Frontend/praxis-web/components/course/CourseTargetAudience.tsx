import { Users, AlertCircle, CheckCircle2 } from "lucide-react";

interface CourseTargetAudienceProps {
  targetAudience?: string[];
  prerequisites?: string[];
}

export function CourseTargetAudience({
  targetAudience,
  prerequisites,
}: CourseTargetAudienceProps) {
  if (
    (!targetAudience || targetAudience.length === 0) &&
    (!prerequisites || prerequisites.length === 0)
  ) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Target Audience */}
        {targetAudience && targetAudience.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-brand-700">
              <Users className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-ink-900-solid">
                Who This Course Is For
              </h2>
            </div>
            <p className="mt-2 text-sm text-ink-500">
              This course is tailored for individuals ready to commit to rigorous, practical learning:
            </p>

            <ul className="mt-4 space-y-2.5">
              {targetAudience.map((audience, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success-500"
                    aria-hidden="true"
                  />
                  <span>{audience}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prerequisites */}
        {prerequisites && prerequisites.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-brand-700">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-ink-900-solid">
                Prerequisites
              </h2>
            </div>
            <p className="mt-2 text-sm text-ink-500">
              What you need before enrolling in this cohort:
            </p>

            <ul className="mt-4 space-y-2.5">
              {prerequisites.map((prereq, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600"
                    aria-hidden="true"
                  />
                  <span>{prereq}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
