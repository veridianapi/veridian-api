"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const STORAGE_KEY = "veridian_onboarding_dismissed";

interface Props {
  hasApiKey: boolean;
  hasVerification: boolean;
  hasPaidPlan: boolean;
}

export default function OnboardingChecklist({ hasApiKey, hasVerification, hasPaidPlan }: Props) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid hydration flash
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    setDismissed(isDismissed);
    setMounted(true);
  }, []);

  const steps = [
    {
      label: "Create your first API key",
      href: "/dashboard/api-keys",
      done: hasApiKey,
    },
    {
      label: "Make your first verification request",
      href: "/dashboard/help",
      done: hasVerification,
    },
    {
      label: "Set up a webhook endpoint",
      href: "/dashboard/help",
      done: false,
    },
    {
      label: "Upgrade to a paid plan",
      href: "/dashboard/billing",
      done: hasPaidPlan,
    },
  ];

  const allDone = steps.every((s) => s.done);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  if (!mounted || dismissed) return null;

  return (
    <div
      className="rounded-xl p-6 mb-8"
      style={{ backgroundColor: "#111916", border: "1px solid rgba(29,158,117,0.25)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {/* Teal lightning bolt — marks this as an active onboarding prompt */}
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="none"
              stroke="#1d9e75"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h2 className="text-sm font-semibold" style={{ color: "#f0f4f3" }}>
              Get started with Veridian
            </h2>
          </div>
          <p className="text-xs mt-1" style={{ color: "#5a7268" }}>
            Complete these steps to start running verifications.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs font-medium shrink-0 ml-4 hover:opacity-80"
          style={{ color: "#5a7268" }}
          aria-label="Dismiss checklist"
        >
          {allDone ? "Dismiss" : "Skip"}
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={
                step.done
                  ? {
                      backgroundColor: "rgba(22,163,74,0.12)",
                      border: "1px solid rgba(22,163,74,0.30)",
                    }
                  : {
                      border: "1px solid rgba(255,255,255,0.12)",
                      backgroundColor: "transparent",
                    }
              }
            >
              {step.done && (
                <svg className="w-3 h-3" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <Link
              href={step.href}
              className="text-sm hover:opacity-80 transition-opacity"
              style={{
                color: step.done ? "#5a7268" : "#a3b3ae",
                textDecoration: step.done ? "line-through" : "none",
              }}
            >
              {step.label}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
