import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

// Mirrors the backend's password policy exactly (auth/dto) so a form that
// passes client-side validation is never rejected server-side for a rule
// the client didn't know about.
const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^a-zA-Z0-9]/, "Password must include a symbol");

const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => isValidPhoneNumber(val), "Enter a valid phone number, e.g. +374XXXXXXXX");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords don't match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// Used by the admin student-search box — trims and caps length to match the
// backend's query param validation.
export const studentSearchSchema = z.object({
  query: z.string().trim().max(120).optional(),
});
