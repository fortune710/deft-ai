"use client";  // Error boundaries must be Client Components

import posthog from "posthog-js";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <div>
        <p>Error: {error.message}</p>
        <button onClick={reset}>Reset</button>
    </div>
  );
}
