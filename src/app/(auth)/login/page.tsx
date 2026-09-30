import { AuthForm } from "@/components/auth-form";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  const params = await searchParams;
  return (
    <div>
      {params.error && (
        <p className="notice error" role="alert">
          This confirmation link is invalid or expired. Try signing in or
          request a new reset link.
        </p>
      )}
      {params.reset === "success" && (
        <p className="notice success" role="status">
          Password updated. Sign in with your new password.
        </p>
      )}
      <AuthForm mode="login" />
    </div>
  );
}
