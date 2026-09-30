import Link from "next/link";
import { Zap, ShieldCheck, ReceiptText, Activity } from "lucide-react";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <Link href="/login" className="brand">
          <span className="brand-icon">
            <Zap size={23} fill="currentColor" />
          </span>
          PowerFlow<span className="brand-period">.</span>
        </Link>
        <div className="auth-story">
          <span className="eyebrow">A CLEARER VIEW OF YOUR ENERGY</span>
          <h2>
            Less paperwork.
            <br />
            More peace of mind.
          </h2>
          <p>
            Your electricity account, from the first reading to the last
            receipt.
          </p>
          <div className="auth-features">
            <span>
              <ReceiptText />
              All your bills, together
            </span>
            <span>
              <Activity />
              Understand your consumption
            </span>
            <span>
              <ShieldCheck />
              Your account stays yours
            </span>
          </div>
        </div>
        <p className="auth-copyright">
          PowerFlow · Electricity Bill Management System
        </p>
      </section>
      <section className="auth-content">{children}</section>
    </main>
  );
}
