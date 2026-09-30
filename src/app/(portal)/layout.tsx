import { requireCustomer } from "@/lib/auth";
import { Shell } from "@/components/shell";
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireCustomer();
  return (
    <Shell name={profile.full_name} admin={profile.role === "admin"}>
      {children}
    </Shell>
  );
}
