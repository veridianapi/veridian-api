"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STORAGE_KEY = "veridian_last_activity";
const CHECK_INTERVAL_MS = 60_000; // check every minute

const TRACKED_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export default function ActivityGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function recordActivity() {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    async function checkAndExpire() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // No record yet — session is fresh, just stamp it
        recordActivity();
        return;
      }
      const elapsed = Date.now() - parseInt(raw, 10);
      if (elapsed > INACTIVITY_LIMIT_MS) {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login?expired=1");
      }
    }

    // Check immediately on mount
    checkAndExpire();

    // Track user gestures
    TRACKED_EVENTS.forEach((event) =>
      window.addEventListener(event, recordActivity, { passive: true })
    );

    // Periodic check
    const interval = setInterval(checkAndExpire, CHECK_INTERVAL_MS);

    return () => {
      TRACKED_EVENTS.forEach((event) =>
        window.removeEventListener(event, recordActivity)
      );
      clearInterval(interval);
    };
  }, [router]);

  // Also stamp on every navigation so page transitions count as activity
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  }, [pathname]);

  return null;
}
