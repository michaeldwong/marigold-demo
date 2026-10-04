"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Browser-side redirect (works in static exports, where server redirects are unavailable). */
export function ClientRedirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return (
    <p className="text-[12.5px] text-ink-3">
      Redirecting to <Link href={to} className="text-info hover:underline">{to}</Link>…
    </p>
  );
}
