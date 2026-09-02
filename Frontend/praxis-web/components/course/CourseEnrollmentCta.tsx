import { Send, MessageCircleQuestion, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { buildTelegramEnrollmentUrl, buildTelegramInquiryUrl } from "@/lib/telegram";
import type { Course } from "@/lib/types";

interface CourseEnrollmentCtaProps {
  course: Course;
}

export function CourseEnrollmentCta({ course }: CourseEnrollmentCtaProps) {
  const telegramEnrollUrl = buildTelegramEnrollmentUrl(course.title);
  const telegramInquiryUrl = buildTelegramInquiryUrl(course.title);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-brand-900 p-8 text-white shadow-md sm:p-12">
      {/* Decorative gradient blur */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-600/30 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-700/60 px-3.5 py-1 text-xs font-medium text-brand-100 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-brand-300" aria-hidden="true" />
          Next Cohort Starting Soon
        </span>

        <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          Ready to master {course.title}?
        </h2>

        <p className="mt-3 text-base text-brand-100 sm:text-lg">
          Join a small, focused cohort with direct mentorship from industry engineers. Secure your seat today.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 text-2xl font-bold">
          <span>{formatMoney(course.monthlyPrice, course.currency)}</span>
          <span className="text-sm font-normal text-brand-200">/ month</span>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={telegramEnrollUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button
              size="lg"
              className="w-full gap-2 bg-white text-brand-900 hover:bg-brand-50 sm:w-auto"
            >
              <Send className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Enroll Now on Telegram
            </Button>
          </a>

          <a
            href={telegramInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
          >
            <Button
              size="lg"
              variant="ghost"
              className="w-full gap-2 border border-brand-700 text-white hover:bg-brand-800/60 sm:w-auto"
            >
              <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
              Ask a Question
            </Button>
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-brand-200">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-300" aria-hidden="true" />
            No long-term lock-in • Monthly subscription
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-brand-300" aria-hidden="true" />
            Direct unblocking on Telegram
          </span>
        </div>
      </div>
    </section>
  );
}
