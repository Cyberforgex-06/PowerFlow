import { z } from "zod";

export const emailSchema = z.string().email("Enter a valid email address.");
export const passwordSchema = z.string()
  .min(10, "Use at least 10 characters.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be 72 bytes or fewer.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/\d/, "Add a number.");

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });
export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: emailSchema,
  password: passwordSchema,
});
export const readingSchema = z.object({ meter_id: z.string().min(1, "Choose a meter."), reading: z.string().refine(v => Number.isFinite(Number(v)) && Number(v) >= 0, "Enter a valid non-negative reading.") });
export const complaintSchema = z.object({ category: z.string().min(2).max(40), subject: z.string().min(3).max(160), message: z.string().min(8).max(4000), bill_id: z.string().optional() });
