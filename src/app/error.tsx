"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>We couldn’t load this page</h1>
      <p>
        Please try again. If the problem continues, contact your electricity
        provider.
      </p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
