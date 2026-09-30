import { requireCustomer } from "@/lib/auth";
import { Dashboard } from "@/components/dashboard";
export default async function DashboardPage() {
  const { client, user, profile } = await requireCustomer();
  const [bills, meters] = await Promise.all([
    client
      .from("bills")
      .select("*")
      .eq("customer_id", user.id)
      .order("billing_period_start", { ascending: false }),
    client
      .from("meters")
      .select("*")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  if (bills.error || meters.error)
    throw new Error("Unable to load your account.");
  return (
    <Dashboard
      name={profile.full_name}
      bills={bills.data ?? []}
      meters={meters.data ?? []}
    />
  );
}
