"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  Activity,
  CreditCard,
  Gauge,
  Bell,
  UserRound,
  ShieldCheck,
  Zap,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/bills", "My bills", ReceiptText],
  ["/consumption", "Consumption", Activity],
  ["/payments", "Payments", CreditCard],
  ["/meters", "My meters", Gauge],
  ["/notifications", "Notifications", Bell],
  ["/profile", "Profile & security", UserRound],
] as const;
export function Shell({
  children,
  name,
  admin = false,
  preview = false,
}: {
  children: React.ReactNode;
  name: string;
  admin?: boolean;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Sign out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="mobile-header">
        <Link href={preview ? "/preview" : "/dashboard"} className="brand">
          <Zap />
          PowerFlow<span className="brand-period">.</span>
        </Link>
        <button
          className="icon-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="sidebar"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside id="sidebar" className={`sidebar ${open ? "open" : ""}`}>
        <Link href={preview ? "/preview" : "/dashboard"} className="brand">
          <span className="brand-icon">
            <Zap size={23} fill="currentColor" />
          </span>
          PowerFlow<span className="brand-period">.</span>
        </Link>
        <span className="nav-label">YOUR ACCOUNT</span>
        <nav aria-label="Main navigation">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={preview ? "/login" : href}
              onClick={() => setOpen(false)}
              className={
                (preview && href === "/dashboard") ||
                pathname === href ||
                pathname.startsWith(href + "/")
                  ? "nav-link active"
                  : "nav-link"
              }
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
          {admin && (
            <Link
              className={`nav-link ${pathname.startsWith("/admin") ? "active" : ""}`}
              href="/admin"
              onClick={() => setOpen(false)}
            >
              <ShieldCheck size={20} />
              Administration
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="account-chip">
            <span className="avatar">{name.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>
                {preview
                  ? "Preview account"
                  : admin
                    ? "Administrator"
                    : "Customer account"}
              </small>
            </div>
          </div>
          {preview ? (
            <Link className="nav-link" href="/login">
              <LogOut size={18} />
              Sign in to your account
            </Link>
          ) : (
            <button className="logout" onClick={logout} disabled={busy}>
              <LogOut size={18} />
              {busy ? "Signing out…" : "Sign out"}
            </button>
          )}
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>Electricity account</span>
          <div>
            <Link
              href={preview ? "/login" : "/notifications"}
              aria-label="Notifications"
              className="icon-link"
            >
              <Bell size={20} />
            </Link>
            <span className="avatar">{name.charAt(0).toUpperCase()}</span>
          </div>
        </header>
        {preview && (
          <div className="preview-banner">
            Dashboard preview · Sample data{" "}
            <Link href="/login">Sign in for your account</Link>
          </div>
        )}
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="workspace-footer">
          PowerFlow <span>Electricity, made clearer.</span>
        </footer>
      </div>
    </div>
  );
}
