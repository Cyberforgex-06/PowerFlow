import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const requireCustomer = cache(async () => {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login");
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  if (profileError || !profile)
    throw new Error(
      "Your account profile could not be loaded. Please try again.",
    );
  return { client, user: data.user, profile };
});
export async function requireAdmin() {
  const context = await requireCustomer();
  if (context.profile.role !== "admin") redirect("/dashboard");
  return context;
}
