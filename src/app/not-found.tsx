import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone">
      <h1>Page not found</h1>
      <p>This page may have moved.</p>
      <Link className="button" href="/dashboard">
        Go to dashboard
      </Link>
    </main>
  );
}
