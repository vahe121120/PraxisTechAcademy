import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen, Calendar, MessageCircleQuestion } from "lucide-react";
import { getCourseWithFallback } from "@/lib/api/courses";
import { listCourseGroups } from "@/lib/api/course-groups";
import { CourseGroupRow } from "@/components/course/CourseGroupRow";
import { CourseHero } from "@/components/course/CourseHero";
import { CourseAbout } from "@/components/course/CourseAbout";
import { CourseLearningOutcomes } from "@/components/course/CourseLearningOutcomes";
import { CurriculumAccordion } from "@/components/course/CurriculumAccordion";
import { CourseProjects } from "@/components/course/CourseProjects";
import { CourseTargetAudience } from "@/components/course/CourseTargetAudience";
import { CourseKeyInfo } from "@/components/course/CourseKeyInfo";
import { CourseEnrollmentCta } from "@/components/course/CourseEnrollmentCta";
import { buildTelegramInquiryUrl } from "@/lib/telegram";

interface CourseDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const course = await getCourseWithFallback(id);
  if (!course) {
    return { title: "Course Not Found" };
  }

  const firstLine = course.description ? course.description.split("\n")[0] || "" : "";
  const description = (course.shortDescription || firstLine).slice(0, 160);

  return {
    title: course.title,
    description,
    openGraph: {
      title: `${course.title} — Praxis Tech Academy`,
      description,
      type: "website",
    },
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params;
  const course = await getCourseWithFallback(id);

  if (!course) {
    notFound();
  }

  // Live cohorts for this course if available
  const groupsResult = await listCourseGroups({ courseId: course.id }).catch(() => ({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
  }));

  const upcomingGroups = (groupsResult?.data || []).filter(
    (g) => g.status !== "COMPLETED" && g.status !== "CANCELLED",
  );

  const telegramInquiryUrl = buildTelegramInquiryUrl(course.title);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-10 sm:gap-14">
        {/* 1. Hero Section */}
        <CourseHero course={course} />

        {/* 2. About the Course */}
        <CourseAbout course={course} />

        {/* 3. What You Will Learn */}
        {course.learningOutcomes && course.learningOutcomes.length > 0 && (
          <CourseLearningOutcomes outcomes={course.learningOutcomes} />
        )}

        {/* 4. What You Will Build & Practice */}
        {course.projects && course.projects.length > 0 && (
          <CourseProjects projects={course.projects} />
        )}

        {/* 5. Course Program / Curriculum */}
        {course.modules && course.modules.length > 0 && (
          <section id="curriculum" className="scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-2 text-brand-700">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <h2 className="text-xl font-bold tracking-tight text-ink-900-solid sm:text-2xl">
                Course Program & Curriculum
              </h2>
            </div>
            <p className="mt-2 text-sm text-ink-500">
              Structured in progressive modules. Click any module to explore detailed lecture topics and exercises.
            </p>

            <div className="mt-6">
              <CurriculumAccordion modules={course.modules} />
            </div>
          </section>
        )}

        {/* 6. Who This Course Is For & Prerequisites */}
        <CourseTargetAudience
          targetAudience={course.targetAudience}
          prerequisites={course.prerequisites}
        />

        {/* 7. Course Logistics & Key Info */}
        <CourseKeyInfo course={course} />

        {/* 8. Upcoming Cohorts / Enrollment */}
        <section id="cohorts" className="scroll-mt-20 rounded-2xl border border-ink-100 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2 text-brand-700">
            <Calendar className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-xl font-bold tracking-tight text-ink-900-solid sm:text-2xl">
              Upcoming Cohorts
            </h2>
          </div>
          <p className="mt-2 text-sm text-ink-500">
            Select a live cohort to join or contact our admissions team on Telegram to reserve a seat.
          </p>

          <div className="mt-6">
            {upcomingGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ink-100 p-8 text-center">
                <p className="font-medium text-ink-900-solid">
                  No scheduled public cohorts currently open for enrollment
                </p>
                <p className="mt-1.5 text-sm text-ink-500">
                  We launch new cohorts monthly. Contact us on Telegram to join the priority waitlist for the next start date.
                </p>
                <div className="mt-5">
                  <a
                    href={telegramInquiryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                  >
                    <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
                    Join Waitlist via Telegram
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingGroups.map((group) => (
                  <CourseGroupRow key={group.id} group={group} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 9. Conversion CTA Banner */}
        <CourseEnrollmentCta course={course} />
      </div>
    </div>
  );
}
