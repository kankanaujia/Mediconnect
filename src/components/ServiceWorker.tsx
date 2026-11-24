"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds (dev keeps it off to avoid stale files). */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => null);
  }, []);
  return null;
}
