"use client";

import { useEffect } from "react";

// Safari's back-forward cache doesn't always honor Cache-Control: no-store
// (see proxy.ts) — a swipe gesture can still restore a frozen, pre-auth-check
// copy of the page from memory. "pageshow" with persisted=true fires exactly
// when that happens, so we force a real reload, which re-runs the middleware.
export function BfcacheGuard() {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return null;
}
