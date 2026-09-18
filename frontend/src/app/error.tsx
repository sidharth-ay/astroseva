"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <h2 className="text-2xl font-display font-bold mb-4" style={{ color: "var(--text-primary)" }}>Something went wrong</h2>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        An unexpected error occurred. Please try again.
      </p>
      <button onClick={reset} className="btn-primary">
        Try Again
      </button>
    </div>
  );
}
