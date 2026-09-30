"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function AuthForm({
  mode,
}: {
  mode: "login" | "register" | "forgot" | "reset";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const client = createClient();
      const callback = `${window.location.origin}/auth/callback`;
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setError(
            "Unable to sign in. Check your email and password, and confirm your email if needed.",
          );
          return;
        }
        router.replace("/dashboard");
        router.refresh();
      } else if (mode === "register") {
        const full_name = String(form.get("full_name") ?? "").trim();
        if (full_name.length < 2 || full_name.length > 120) {
          setError("Enter a name between 2 and 120 characters.");
          return;
        }
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { full_name }, emailRedirectTo: callback },
        });
        if (error) {
          setError(
            "Unable to create your account. Check your details or try again later.",
          );
          return;
        }
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else
          setMessage(
            "Check your email for a confirmation link. Then come back to sign in.",
          );
      } else if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${callback}?next=/reset-password`,
        });
        if (error) {
          setError(
            "Unable to send a reset link right now. Please try again later.",
          );
          return;
        }
        setMessage(
          "If an account exists for this email, you will receive a password reset link.",
        );
      } else {
        if (password !== String(form.get("confirm_password"))) {
          setError("The passwords do not match.");
          return;
        }
        const { error } = await client.auth.updateUser({ password });
        if (error) {
          setError(
            "Unable to update your password. Request a new reset link and try again.",
          );
          return;
        }
        await client.auth.signOut();
        router.replace("/login?reset=success");
        router.refresh();
      }
    } catch {
      setError("We couldn’t connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  const title = {
    login: "Welcome back",
    register: "Create your account",
    forgot: "Forgot your password?",
    reset: "Set a new password",
  }[mode];
  return (
    <div className="auth-card">
      <span className="eyebrow">YOUR POWER, IN ONE PLACE</span>
      <h1>{title}</h1>
      <p className="muted">
        {mode === "login"
          ? "Sign in to manage your electricity account."
          : mode === "register"
            ? "Keep track of bills, payments and energy use."
            : mode === "forgot"
              ? "We’ll email you a link to reset your password."
              : "Choose a strong password for your account."}
      </p>
      <form onSubmit={submit} className="form-stack">
        {mode === "register" && (
          <label>
            Full name
            <input
              name="full_name"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              required
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              required
            />
            {mode !== "login" && <small>Use at least 12 characters.</small>}
          </label>
        )}
        {mode === "reset" && (
          <label>
            Confirm password
            <input
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
        )}
        {mode === "login" && (
          <Link className="form-link" href="/forgot-password">
            Forgot password?
          </Link>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice success" role="status">
            {message}
          </p>
        )}
        <button disabled={busy}>
          {busy
            ? "Please wait…"
            : {
                login: "Sign in",
                register: "Create account",
                forgot: "Send reset link",
                reset: "Save new password",
              }[mode]}
        </button>
      </form>
      <p className="auth-footer">
        {mode === "login" ? (
          <>
            New to PowerFlow? <Link href="/register">Create an account</Link>
          </>
        ) : (
          <>
            Already have an account? <Link href="/login">Sign in</Link>
          </>
        )}
      </p>
      <Link className="preview-link" href="/preview">
        Explore the dashboard preview
      </Link>
    </div>
  );
}
