"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = "veridian_last_activity";
const CHECK_INTERVAL_MS = 60_000; // check every minute

const TRACKED_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export default function ActivityGuard() {
  const router = useRouter();

  useEffect(() => {
    function recordActivity() {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    async function checkAndExpire() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return; // no record yet — session is fresh
      const elapsed = Date.now() - parseInt(raw, 10);
      if (elapsed > INACTIVITY_LIMIT_MS) {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login?expired=1");
      }
    }

    // Check immediately on mount
    checkAndExpire();

    // Record activity now and on every user gesture
    recordActivity();
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

  return null;
}
