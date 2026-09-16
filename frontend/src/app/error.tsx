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
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h2>
      <p className="text-gray-700 mb-6">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2 rounded-lg"
      >
        Try Again
      </button>
    </div>
  );
}
