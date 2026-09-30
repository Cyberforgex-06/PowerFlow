import { requireCustomer } from "@/lib/auth";
import { BillsList } from "@/components/bills-list";
import { PageHeading } from "@/components/ui";
import Link from "next/link";
export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { client, user } = await requireCustomer();
  const { status } = await searchParams;
  let query = client
    .from("bills")
    .select("*")
    .eq("customer_id", user.id)
    .order("billing_period_start", { ascending: false });
  if (status === "unpaid") query = query.in("status", ["pending", "overdue"]);
  if (status === "paid") query = query.eq("status", "paid");
  const { data, error } = await query;
  if (error) throw new Error("Unable to load bills.");
  return (
    <>
      <PageHeading
        title="My bills"
        description="Your electricity statements, all in one place."
      />
      <nav className="tabs" aria-label="Filter bills">
        {[
          ["", "All bills"],
          ["unpaid", "Unpaid"],
          ["paid", "Paid"],
        ].map(([value, label]) => (
          <Link
            aria-current={(status ?? "") === value ? "page" : undefined}
            className={(status ?? "") === value ? "selected" : ""}
            href={value ? `/bills?status=${value}` : "/bills"}
            key={value}
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className="panel">
        <BillsList bills={data ?? []} />
      </section>
    </>
  );
}
