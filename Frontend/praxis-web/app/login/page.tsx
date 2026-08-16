"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/validation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/http";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    try {
      const user = await login(values.email, values.password);
      const returnTo = searchParams.get("returnTo");
      if (returnTo && returnTo.startsWith("/")) {
        router.push(returnTo);
      } else {
        router.push(user.role === "ADMIN" ? "/admin" : "/dashboard");
      }
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.statusCode === 401
          ? "Incorrect email or password."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-ink-900-solid">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-500">Log in to your Praxis account.</p>

      <Card className="mt-6">
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            {formError && (
              <p role="alert" className="text-sm text-danger-600">
                {formError}
              </p>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Log in
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-4 text-center text-sm text-ink-500">
        New to Praxis?{" "}
        <Link href="/register" className="font-medium text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
