"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface Props {
  plan: string;
  label: string;
  isUpgrade: boolean;
}

export default function SwitchPlanButton({ plan, label, isUpgrade }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Not authenticated — please sign in again");
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/billing/checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plan }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const { checkout_url } = await res.json();
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-2.5 text-sm rounded-lg font-medium transition-all duration-150 min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
        style={
          isUpgrade
            ? { backgroundColor: "#1d9e75", color: "#ffffff" }
            : { border: "1px solid #1a2b25", color: "#a3b3ae", backgroundColor: "transparent" }
        }
      >
        {loading ? "Loading…" : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
