"use client";

import { useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormValues } from "@/lib/validation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/http";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";

function RegisterForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        phone: values.phone,
      });
      const returnTo = searchParams.get("returnTo");
      router.push(returnTo && returnTo.startsWith("/") ? returnTo : "/dashboard");
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-ink-900-solid">Create your account</h1>
      <p className="mt-1 text-sm text-ink-500">Start with any track — you can enroll after.</p>

      <Card className="mt-6">
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <Input
              label="Full name"
              autoComplete="name"
              error={errors.fullName?.message}
              {...register("fullName")}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+374XXXXXXXX"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              hint="At least 12 characters, with upper/lowercase, a number, and a symbol."
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            {formError && (
              <p role="alert" className="text-sm text-danger-600">
                {formError}
              </p>
            )}

            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Create account
            </Button>
          </form>
        </CardBody>
      </Card>

      <p className="mt-4 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RegisterForm />
    </Suspense>
  );
}
