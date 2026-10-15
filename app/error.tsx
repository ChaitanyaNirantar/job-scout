"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
      <p className="font-heading text-5xl">Brief</p>
      <h1 className="text-lg font-medium">Something went wrong opening the desk.</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button type="button" className="h-10 self-start" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
