import { Code2, FolderGit2 } from "lucide-react";
import type { CourseProjectItem } from "@/lib/types";

interface CourseProjectsProps {
  projects: CourseProjectItem[];
}

export function CourseProjects({ projects }: CourseProjectsProps) {
  if (!projects || projects.length === 0) return null;

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
      <div className="flex items-center gap-2 text-brand-700">
        <FolderGit2 className="h-5 w-5" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight text-ink-900-solid sm:text-2xl">
          What You Will Build & Practice
        </h2>
      </div>
      <p className="mt-2 text-sm text-ink-500">
        Hands-on production projects that simulate real engineering team workflows and populate your GitHub portfolio.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-ink-100 bg-ink-50/30 p-5 transition-shadow hover:border-brand-300 hover:bg-white hover:shadow-sm"
          >
            <div>
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Code2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-ink-900-solid">{project.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {project.description}
              </p>
            </div>

            {project.tech && project.tech.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-ink-100 pt-3">
                {project.tech.map((t, tIdx) => (
                  <span
                    key={tIdx}
                    className="inline-flex items-center rounded-md bg-brand-50/60 px-2 py-0.5 text-xs font-medium text-brand-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
