import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export default async function Reset() {
  const client = await createClient();
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/forgot-password");
  return <AuthForm mode="reset" />;
}
