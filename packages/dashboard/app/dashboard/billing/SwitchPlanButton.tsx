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
      setError(err instanceof Error ? err.message : "Request failed — please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
        style={
          isUpgrade
            ? {
                backgroundColor: "#1d9e75",
                color: "#050a09",
                height: 36,
                borderRadius: 8,
              }
            : {
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#a3b3ae",
                backgroundColor: "transparent",
                height: 36,
                borderRadius: 8,
              }
        }
      >
        {loading ? "Loading…" : label}
      </button>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "#dc2626" }}>{error}</p>
      )}
    </div>
  );
}
