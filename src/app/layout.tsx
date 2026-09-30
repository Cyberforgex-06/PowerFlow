import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "PowerFlow | Electricity bill management",
    template: "%s | PowerFlow",
  },
  description:
    "Manage your electricity bills, meters, payments and energy consumption.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
