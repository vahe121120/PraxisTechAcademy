import Link from "next/link";
import { ArrowRight, Code2, MessagesSquare, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { CourseCard } from "@/components/course/CourseCard";
import { COURSES_CATALOG } from "@/lib/courses-data";

const benefits = [
  {
    icon: Code2,
    title: "Real Production Projects",
    description: "Selenium, Playwright, Node.js, and CI pipelines — test and build real applications, not toy exercises.",
  },
  {
    icon: ShieldCheck,
    title: "Senior Engineering Mentors",
    description: "Learn from practicing engineers who review your code line-by-line and share real industry standards.",
  },
  {
    icon: MessagesSquare,
    title: "Dedicated Telegram Cohort",
    description: "Weekly live sessions and an active Telegram group with your instructor to keep you unblocked every day.",
  },
];

export default function LandingPage() {
  const featuredCourses = COURSES_CATALOG.slice(0, 3);

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1 text-sm font-medium text-brand-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Cohort-based IT Academy
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink-900-solid sm:text-5xl lg:text-6xl">
            Learn to ship, not just to pass a quiz.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-500 sm:text-xl">
            Praxis Tech Academy runs practical, instructor-led courses in QA Automation, Backend Engineering, Python, and Systems Programming. Small cohorts, real projects, and a Telegram group where you actually get unblocked.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/courses">
              <Button size="lg">
                Browse all courses
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Create an account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="border-t border-ink-100 bg-ink-50/50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                Popular Programs
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-900-solid sm:text-3xl">
                Featured Courses
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                Explore our flagship courses with upcoming cohort enrollment.
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-900"
            >
              View all courses
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCourses.map((course) => (
              <CourseCard key={course.slug || course.id} course={course} />
            ))}
          </div>
        </div>
      </section>

      {/* What You Get / Benefits */}
      <section className="border-t border-ink-100 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink-900-solid sm:text-3xl">
              Why Learn at Praxis Tech Academy?
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              We focus on building real engineering capability through intense practice and small groups.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {benefits.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="transition-all hover:border-brand-200 hover:shadow-sm">
                <CardBody className="flex flex-col gap-3.5 p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                    <Icon className="h-6 w-6 text-brand-600" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-ink-900-solid">{title}</h3>
                  <p className="text-sm leading-relaxed text-ink-500">{description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
