import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";
import "./premium.css";


export const metadata: Metadata = {
  title: { default: "PowerBill — Less bill stress. More life.", template: "%s · PowerBill" },
  icons: { icon: "/favicon.svg" },
  description: "A secure electricity bill management system for meter readings, billing, payments, receipts and complaints.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#F7F5EF" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Nonce CSP requires request-time rendering so Next can inject the request nonce.
  await connection();
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}
