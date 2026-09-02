"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, BookOpen } from "lucide-react";
import type { CourseModuleItem } from "@/lib/types";

interface CurriculumAccordionProps {
  modules: CourseModuleItem[];
}

export function CurriculumAccordion({ modules }: CurriculumAccordionProps) {
  // Default to expanding the first module
  const [openIndices, setOpenIndices] = useState<Record<number, boolean>>({ 0: true });

  function toggleModule(index: number) {
    setOpenIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }

  function expandAll() {
    const all: Record<number, boolean> = {};
    modules.forEach((_, i) => {
      all[i] = true;
    });
    setOpenIndices(all);
  }

  function collapseAll() {
    setOpenIndices({});
  }

  const allExpanded = modules.every((_, i) => openIndices[i]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
          <span>{modules.length} comprehensive modules</span>
        </div>
        <button
          type="button"
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-xs font-semibold text-brand-700 hover:underline"
        >
          {allExpanded ? "Collapse all modules" : "Expand all modules"}
        </button>
      </div>

      <div className="space-y-3">
        {modules.map((module, index) => {
          const isOpen = Boolean(openIndices[index]);
          const moduleId = `module-content-${index}`;
          const buttonId = `module-header-${index}`;

          return (
            <div
              key={module.title + index}
              className={`overflow-hidden rounded-xl border transition-colors ${
                isOpen ? "border-brand-300 bg-white shadow-sm" : "border-ink-100 bg-white hover:border-ink-300"
              }`}
            >
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={moduleId}
                onClick={() => toggleModule(index)}
                className="flex w-full items-start justify-between gap-4 p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-xs font-semibold text-brand-700">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink-900-solid sm:text-lg">
                      {module.title}
                    </h3>
                    <p className="mt-1 text-sm text-ink-500">{module.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1">
                  <span className="hidden text-xs text-ink-500 sm:inline">
                    {module.topics.length} topics
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 text-ink-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-brand-600" : ""
                    }`}
                    aria-hidden="true"
                  />
                </div>
              </button>

              {isOpen && (
                <div
                  id={moduleId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="border-t border-ink-100 bg-ink-50/50 px-5 py-4"
                >
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Topics covered in this module:
                  </h4>
                  <ul className="space-y-2.5">
                    {module.topics.map((topic, tIdx) => (
                      <li
                        key={tIdx}
                        className="flex items-start gap-2.5 text-sm text-ink-700"
                      >
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                          aria-hidden="true"
                        />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
