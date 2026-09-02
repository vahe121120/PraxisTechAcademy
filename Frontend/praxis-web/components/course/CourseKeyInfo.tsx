import {
  Calendar,
  Clock,
  Layers,
  Globe,
  Award,
  CreditCard,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { Course } from "@/lib/types";

interface CourseKeyInfoProps {
  course: Course;
}

export function CourseKeyInfo({ course }: CourseKeyInfoProps) {
  const details = [
    {
      icon: GraduationCap,
      label: "Skill Level",
      value: course.level || "All Levels",
    },
    {
      icon: Clock,
      label: "Course Duration",
      value: `${course.durationDays} days (~${Math.round(course.durationDays / 30)} months)`,
    },
    {
      icon: Layers,
      label: "Delivery Format",
      value: course.format || "Live Online Sessions + Telegram Study Group",
    },
    {
      icon: Globe,
      label: "Instruction Language",
      value: course.language || "Armenian (English tech terms)",
    },
    {
      icon: Calendar,
      label: "Class Schedule",
      value: course.schedule || "2 live sessions per week (evening)",
    },
    {
      icon: CreditCard,
      label: "Tuition / Pricing",
      value: `${formatMoney(course.monthlyPrice, course.currency)} per month`,
    },
    {
      icon: Award,
      label: "Certification",
      value:
        typeof course.certificate === "string"
          ? course.certificate
          : "Verified Praxis Tech Academy Certificate",
    },
    {
      icon: MessageSquare,
      label: "Mentorship & Support",
      value: "Daily instructor unblocking via private Telegram group",
    },
  ];

  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
      <h2 className="text-xl font-bold tracking-tight text-ink-900-solid sm:text-2xl">
        Course Logistics & Information
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        Everything you need to know about the schedule, duration, and learning structure.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {details.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/40 p-4"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
                {label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-ink-900-solid">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
