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
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY) === "true";
    setDismissed(isDismissed);
    setMounted(true);
  }, []);

  const steps = [
    { label: "Create your first API key",          href: "/dashboard/api-keys",  done: hasApiKey        },
    { label: "Make your first verification request", href: "/dashboard/help",     done: hasVerification  },
    { label: "Set up a webhook endpoint",            href: "/dashboard/webhooks", done: false            },
    { label: "Upgrade to a paid plan",               href: "/dashboard/billing",  done: hasPaidPlan      },
  ];

  const allDone = steps.every((s) => s.done);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  if (!mounted || dismissed) return null;

  return (
    <div className="bg-white/[0.03] border border-[#1d9e75]/[0.20] rounded-xl p-6 mb-2">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="#1d9e75" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-sm font-semibold text-[#f8fafc]">Get started with Veridian</h2>
          </div>
          <p className="text-xs text-[#64748b]">Complete these steps to start running verifications.</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs font-medium shrink-0 ml-4 text-[#64748b] hover:text-[#94a3b8] transition-colors"
          aria-label="Dismiss checklist"
        >
          {allDone ? "Dismiss" : "Skip"}
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              step.done
                ? "bg-[#16a34a]/[0.12] border border-[#16a34a]/[0.30]"
                : "border border-white/[0.12]"
            }`}>
              {step.done && (
                <svg className="w-3 h-3" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <Link
              href={step.href}
              className={`text-sm transition-opacity hover:opacity-80 ${
                step.done ? "text-[#64748b] line-through" : "text-[#94a3b8]"
              }`}
            >
              {step.label}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
