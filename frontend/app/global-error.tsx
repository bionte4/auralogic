'use client';

import { useEffect } from 'react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch('/api/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message.slice(0, 500), path: 'client' }),
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background px-6 py-16 text-foreground">
        <h1 className="text-2xl font-semibold">Something went wrong.</h1>
        <button type="button" className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  );
}
