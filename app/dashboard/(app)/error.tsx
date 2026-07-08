"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

import { Button } from "./_components/ui";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-xl border border-hairline bg-surface px-6 py-12 text-center">
      <h2 className="font-serif text-lg">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">
        That didn&apos;t save. Nothing has been sent to a client. Try again.
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-5"
        onClick={() => unstable_retry()}
      >
        Try again
      </Button>
    </div>
  );
}
