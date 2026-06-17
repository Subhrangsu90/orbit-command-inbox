"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/chat");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent animate-pulse" />
        <p className="text-on-surface-variant text-xs font-semibold animate-pulse">
          Redirecting to Orbit Chat...
        </p>
      </div>
    </div>
  );
}
