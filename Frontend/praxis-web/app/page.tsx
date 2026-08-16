import Link from "next/link";
import { ArrowRight, Code2, MessagesSquare, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

const tracks = [
  {
    icon: Code2,
    title: "QA Automation",
    description: "Selenium, Playwright, and CI pipelines — test real applications, not toy examples.",
  },
  {
    icon: ShieldCheck,
    title: "Backend Engineering",
    description: "Node.js, PostgreSQL, and system design, taught through production-shaped projects.",
  },
  {
    icon: MessagesSquare,
    title: "Live cohort support",
    description: "Weekly live sessions and a Telegram group with your instructor and cohort.",
  },
];

export default function LandingPage() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            Cohort-based IT courses
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink-900-solid sm:text-5xl">
            Learn to ship, not just to pass a quiz.
          </h1>
          <p className="mt-5 text-lg text-ink-500">
            Praxis Tech Academy runs practical, instructor-led courses in QA automation and backend
            engineering — small cohorts, real projects, and a Telegram group where you actually get
            unblocked.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/courses">
              <Button size="lg">
                Browse courses
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

      <section className="border-t border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold text-ink-900-solid">What you get</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {tracks.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardBody className="flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                    <Icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
                  </div>
                  <h3 className="font-medium text-ink-900-solid">{title}</h3>
                  <p className="text-sm text-ink-500">{description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
