"use client";
import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/lib/actions";
export function ActionForm({
  action,
  children,
  label,
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="form-stack">
      {children}
      {state.error && (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="notice success" role="status">
          {state.success}
        </p>
      )}
      <button disabled={pending}>{pending ? "Saving…" : label}</button>
    </form>
  );
}
