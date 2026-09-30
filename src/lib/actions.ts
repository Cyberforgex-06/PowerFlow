"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCustomer, requireAdmin } from "./auth";
export type FormState = { error?: string; success?: string };
const uuid = z.string().uuid();
export async function updateProfile(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { client, user } = await requireCustomer();
  const parsed = z
    .object({
      full_name: z.string().trim().min(2).max(120),
      phone: z
        .string()
        .trim()
        .max(25)
        .regex(/^[+\d\s()-]*$/),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter a valid name and phone number." };
  const { error } = await client
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
    })
    .eq("id", user.id);
  if (error)
    return { error: "Unable to update your profile. Please try again." };
  revalidatePath("/", "layout");
  return { success: "Your profile has been updated." };
}
export async function markRead(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { client, user } = await requireCustomer();
  const id = uuid.safeParse(form.get("id"));
  if (!id.success) return { error: "Invalid notification." };
  const { data, error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id");
  if (error || !data?.length)
    return { error: "Unable to update this notification." };
  revalidatePath("/notifications");
  return { success: "Marked as read." };
}
export async function createMeter(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { client } = await requireAdmin();
  const parsed = z
    .object({
      customer_id: uuid,
      meter_number: z
        .string()
        .trim()
        .min(5)
        .max(40)
        .regex(/^[A-Za-z0-9 -]+$/),
      meter_type: z.enum(["prepaid", "postpaid"]),
      address: z.string().trim().min(5).max(300),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Check the customer, meter number and supply address." };
  const { error } = await client.from("meters").insert(parsed.data);
  if (error)
    return {
      error:
        error.code === "23505"
          ? "That meter number is already registered."
          : "Unable to add this meter.",
    };
  revalidatePath("/admin");
  return { success: "Meter linked to the customer." };
}
export async function createTariff(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { client } = await requireAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(120),
      rate_per_kwh: z.coerce.number().positive().max(100000),
      fixed_charge: z.coerce.number().min(0).max(1000000),
      tax_rate: z.coerce.number().min(0).max(100),
      effective_from: z.iso.date(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Check the tariff details. Tax must be between 0 and 100 percent.",
    };
  const { error } = await client.from("tariffs").insert(parsed.data);
  if (error) return { error: "Unable to create this tariff." };
  revalidatePath("/admin");
  return { success: "Tariff created." };
}
export async function issueBill(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { client } = await requireAdmin();
  const reading = z.coerce
    .number()
    .min(0)
    .max(999999999999.99)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.001);
  const parsed = z
    .object({
      p_meter_id: uuid,
      p_tariff_id: uuid,
      p_previous: reading,
      p_current: reading,
      p_start: z.iso.date(),
      p_end: z.iso.date(),
      p_due: z.iso.date(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error:
        "Check all dates and readings. Readings support up to two decimal places.",
    };
  if (
    parsed.data.p_current < parsed.data.p_previous ||
    parsed.data.p_end < parsed.data.p_start ||
    parsed.data.p_due < parsed.data.p_end
  )
    return {
      error:
        "Readings must increase. The due date must be on or after the billing period ends.",
    };
  const { error } = await client.rpc("issue_bill", parsed.data);
  if (error)
    return {
      error:
        error.code === "23505"
          ? "This meter already has a reading or bill for this period."
          : error.code === "22023"
            ? "Check that the reading continues from the latest one and the tariff covers the full period."
            : "Unable to issue this bill. Please try again.",
    };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/bills");
  return { success: "Reading recorded, bill issued and customer notified." };
}
