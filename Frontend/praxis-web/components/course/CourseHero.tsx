import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Send,
  Sparkles,
  Award,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { buildTelegramEnrollmentUrl } from "@/lib/telegram";
import type { Course } from "@/lib/types";

interface CourseHeroProps {
  course: Course;
}

export function CourseHero({ course }: CourseHeroProps) {
  const telegramEnrollUrl = buildTelegramEnrollmentUrl(course.title);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-6 shadow-sm sm:p-10">
      {/* Subtle brand background highlight */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-50/70 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-ink-500">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 font-medium text-ink-500 transition-colors hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to courses
          </Link>
          <span className="text-ink-300">/</span>
          <span className="font-medium text-ink-700">{course.title}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{course.track}</Badge>
          {course.level && (
            <span className="inline-flex items-center rounded-full bg-ink-50 px-2.5 py-0.5 text-xs font-medium text-ink-700">
              {course.level} Level
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-xs font-medium text-success-500">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Open for Enrollment
          </span>
        </div>

        {/* Title & Short Description */}
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900-solid sm:text-4xl lg:text-5xl">
          {course.title}
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-500 sm:text-xl">
          {course.shortDescription || (course.description ? course.description.split("\n")[0] : "")}
        </p>

        {/* Key Highlight Metrics */}
        <div className="mt-8 grid grid-cols-2 gap-4 border-y border-ink-100 py-5 sm:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
                Duration
              </p>
              <p className="text-base font-semibold text-ink-900-solid">
                {course.durationDays} days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
                Format
              </p>
              <p className="text-base font-semibold text-ink-900-solid">
                Live Cohort
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Award className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
                Certificate
              </p>
              <p className="text-base font-semibold text-ink-900-solid">
                Included
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <span className="font-bold text-brand-600">AMD</span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
                Tuition
              </p>
              <p className="text-base font-semibold text-ink-900-solid">
                {formatMoney(course.monthlyPrice, course.currency)}
                <span className="text-xs font-normal text-ink-500"> / mo</span>
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={telegramEnrollUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button size="lg" className="w-full gap-2 shadow-sm sm:w-auto">
              <Send className="h-4 w-4" aria-hidden="true" />
              Enroll Now via Telegram
            </Button>
          </a>

          <a
            href="#curriculum"
            className="inline-flex"
          >
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              View Curriculum
            </Button>
          </a>

          <a
            href="#cohorts"
            className="inline-flex"
          >
            <Button size="lg" variant="ghost" className="w-full text-ink-700 sm:w-auto">
              Upcoming Cohorts
            </Button>
          </a>
        </div>

        {/* Guarantee items */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success-500" aria-hidden="true" />
            Small cohort size (max 12 students)
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success-500" aria-hidden="true" />
            Direct instructor code reviews
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-success-500" aria-hidden="true" />
            Dedicated Telegram study group
          </span>
        </div>
      </div>
    </section>
  );
}
