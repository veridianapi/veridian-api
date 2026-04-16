"use client";

import { useState, useTransition } from "react";
import { sendSupportEmail } from "./actions";

// ─── Data ──────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    title: "Getting started",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    items: [
      {
        q: "How to create your first API key",
        a: "Go to API Keys in the sidebar, then click Create new key. Give it a name (e.g. Production), confirm, and copy the key shown — it is only displayed once. Store it somewhere safe like a password manager or a secrets manager. Never commit it to version control.",
      },
      {
        q: "Making your first verification request",
        a: `Send a POST request to /v1/verifications with your key in the Authorization header:\n\nPOST /v1/verifications\nAuthorization: Bearer your_api_key\nContent-Type: application/json\n\n{\n  "document_front": "<base64>",\n  "selfie": "<base64>",\n  "document_type": "passport"\n}\n\nThe response includes a verification id, status, and risk_score. Processing typically completes within a few seconds.`,
      },
      {
        q: "Understanding the risk score",
        a: "The risk score is a number from 0 to 100. Under 30 is automatically approved, 30–69 requires manual review, and 70 or above is rejected. The score is computed from: face match confidence between the selfie and document photo, OFAC sanctions screening, document expiry, and the completeness of extracted fields. You can set your own thresholds if the defaults don't fit your use case.",
      },
      {
        q: "Setting up webhooks",
        a: `Include a webhook_url in your verification request body. When processing completes, Veridian will POST the full result to that URL. Verify authenticity by checking the x-veridian-signature header — it is an HMAC-SHA256 signature of the request body using your API key as the secret:\n\n{\n  "document_front": "<base64>",\n  "selfie": "<base64>",\n  "document_type": "passport",\n  "webhook_url": "https://your-app.com/webhooks/veridian"\n}`,
      },
    ],
  },
  {
    title: "API reference",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    items: [
      {
        q: "POST /v1/verifications",
        a: `Creates a new verification. Required fields:\n• document_front (string) — base64-encoded image of the document front\n• selfie (string) — base64-encoded selfie photo\n• document_type (string) — one of: passport, driving_licence, national_id\n\nOptional fields:\n• document_back (string) — base64 back of the document\n• webhook_url (string) — URL to receive the completed result\n\nReturns: { id, status, risk_score, created_at }`,
      },
      {
        q: "GET /v1/verifications/:id",
        a: `Fetches the full result for a completed verification. Returns:\n• id — verification UUID\n• status — pending | approved | review | rejected\n• risk_score — 0–100\n• face_match_score — 0–1 confidence of face match\n• sanctions_hit — boolean, true if OFAC match found\n• extracted — object with name, date_of_birth, expiry, document_number\n• created_at, completed_at`,
      },
      {
        q: "Sanctions screening",
        a: "Every verification is automatically screened against 18,698 OFAC SDN records using fuzzy name matching with a configurable threshold. If sanctions_hit is true, the extracted name matched a record — review the verification manually. A sanctions hit does not automatically mean fraud; common names can generate false positives at lower thresholds.",
      },
      {
        q: "Billing and usage",
        a: `To start or change a subscription, call:\n\nPOST /v1/billing/checkout\nAuthorization: Bearer your_api_key\n\n{ "plan": "starter" }  // starter | growth | scale\n\nThe response includes a checkout_url. Redirect your user there to complete payment via Paddle. Current usage and limits are visible on the Billing page in the dashboard.`,
      },
    ],
  },
  {
    title: "Account & billing",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    items: [
      {
        q: "How does the 14-day free trial work?",
        a: "When you sign up you get immediate, full access to all features for 14 days — no credit card required. You can run real verifications and use the API straight away. When the trial ends you'll need to add a payment method to continue. We send a reminder 3 days before your trial expires.",
      },
      {
        q: "How to upgrade your plan",
        a: "Go to Billing in the sidebar, find the plan you want, and click Switch. You'll be taken to a Paddle-hosted checkout to enter your card details. Upgrades take effect immediately. Unused days on your current plan are prorated and credited to your account.",
      },
      {
        q: "What happens when I hit my verification limit?",
        a: "The API returns a 429 Too Many Requests response with a JSON body explaining the limit has been reached. Existing verifications already in progress are not affected. Upgrade your plan from the Billing page to immediately restore access — the new limit applies as soon as payment is confirmed.",
      },
      {
        q: "Cancellation and refunds",
        a: "You can cancel your subscription at any time from the Billing page — no forms, no calls, no waiting. Your access continues until the end of the billing period. If you're within 14 days of your first payment, contact support@veridianapi.com for a full refund, no questions asked.",
      },
    ],
  },
];

const SUBJECTS = [
  "Technical issue",
  "Billing question",
  "Feature request",
  "Other",
];

// ─── Accordion item ──────────────────────────────────────────────────────────

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-5 py-4 text-left gap-4"
      >
        <span
          className="text-sm font-medium leading-snug"
          style={{ color: open ? "#f0f4f3" : "#a3b3ae" }}
        >
          {q}
        </span>
        <svg
          className="w-4 h-4 shrink-0 transition-transform duration-150"
          style={{
            color: "#1d9e75",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5">
          {a.split("\n").map((line, i) =>
            line === "" ? (
              <div key={i} className="h-2" />
            ) : line.startsWith("•") ||
              line.startsWith("POST") ||
              line.startsWith("GET") ||
              line.startsWith("{") ||
              line.startsWith("}") ||
              line.startsWith("  ") ||
              line.startsWith("Authorization") ||
              line.startsWith("Content-Type") ? (
              <p
                key={i}
                className="text-xs leading-relaxed"
                style={{ fontFamily: "var(--font-mono)", color: "#1d9e75" }}
              >
                {line}
              </p>
            ) : (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "#a3b3ae" }}>
                {line}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { q: string; a: string }[];
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div
        className="flex items-center gap-2 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#1d9e75" }}
      >
        {icon}
        <h2 className="text-sm font-semibold" style={{ color: "#f0f4f3" }}>
          {title}
        </h2>
      </div>
      {items.map((item) => (
        <AccordionItem key={item.q} q={item.q} a={item.a} />
      ))}
    </div>
  );
}

// ─── Contact form ─────────────────────────────────────────────────────────────

function ContactForm() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const charCount = message.length;
  const tooShort = charCount > 0 && charCount < 100;
  const canSubmit = charCount >= 100 && !isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("idle");
    setErrorMsg("");

    startTransition(async () => {
      const result = await sendSupportEmail({ subject, message });
      if (result.ok) {
        setStatus("success");
        setMessage("");
        setSubject(SUBJECTS[0]);
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  }

  if (status === "success") {
    return (
      <div
        className="rounded-xl p-6 flex flex-col items-center text-center"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(29,158,117,0.25)" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: "rgba(29,158,117,0.12)" }}
        >
          <svg className="w-5 h-5" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-base font-medium mb-1" style={{ color: "#f0f4f3" }}>
          Message sent
        </p>
        <p className="text-sm mb-5" style={{ color: "#5a7268" }}>
          We typically reply within a few hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0 16px",
            height: 36,
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            border: "1px solid rgba(255,255,255,0.10)",
            color: "#a3b3ae",
            backgroundColor: "transparent",
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-2 px-5 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 className="text-sm font-semibold" style={{ color: "#f0f4f3" }}>
          Contact support
        </h2>
        <span className="text-xs ml-1" style={{ color: "#5a7268" }}>
          — we usually reply within a few hours
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Subject */}
        <div>
          <label
            htmlFor="support-subject"
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#a3b3ae",
              marginBottom: 6,
              letterSpacing: "0.02em",
            }}
          >
            Subject
          </label>
          <select
            id="support-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full text-sm rounded-lg focus:outline-none focus:ring-2 appearance-none"
            style={{
              backgroundColor: "#0d1211",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#f0f4f3",
              height: 36,
              padding: "0 12px",
              borderRadius: 8,
              fontFeatureSettings: '"cv01","ss03"',
              "--tw-ring-color": "#1d9e75",
            } as React.CSSProperties}
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s} style={{ backgroundColor: "#111916" }}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label
              htmlFor="support-message"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#a3b3ae",
                letterSpacing: "0.02em",
              }}
            >
              Message
            </label>
            <span
              style={{
                fontSize: 11,
                color: tooShort ? "#d97706" : charCount >= 100 ? "#16a34a" : "#5a7268",
              }}
            >
              {charCount}/100 min
            </span>
          </div>
          <textarea
            id="support-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue or question in detail…"
            rows={5}
            className="w-full text-sm rounded-lg focus:outline-none focus:ring-2 resize-none"
            style={{
              backgroundColor: "#0d1211",
              border: `1px solid ${tooShort ? "rgba(217,119,6,0.40)" : "rgba(255,255,255,0.08)"}`,
              color: "#f0f4f3",
              padding: "10px 12px",
              borderRadius: 8,
              fontFeatureSettings: '"cv01","ss03"',
              lineHeight: 1.5,
              "--tw-ring-color": "#1d9e75",
            } as React.CSSProperties}
          />
          {tooShort && (
            <p className="mt-1.5 text-xs" style={{ color: "#d97706" }}>
              Please write at least 100 characters so we can help you effectively.
            </p>
          )}
        </div>

        {/* Error banner */}
        {status === "error" && (
          <div
            className="rounded-lg px-4 py-3"
            style={{
              backgroundColor: "rgba(220,38,38,0.10)",
              border: "1px solid rgba(220,38,38,0.25)",
              borderLeft: "3px solid #dc2626",
            }}
          >
            <p className="text-sm" style={{ color: "#dc2626" }}>{errorMsg}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
            style={{
              backgroundColor: "#1d9e75",
              color: "#050a09",
              height: 36,
              padding: "0 16px",
              borderRadius: 8,
            }}
          >
            {isPending ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send message
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? SECTIONS.map((s) => ({
        ...s,
        items: s.items.filter(
          (item) =>
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((s) => s.items.length > 0)
    : SECTIONS;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ color: "#f0f4f3", letterSpacing: "-0.704px" }}
        >
          How can we help?
        </h1>
        <p className="text-sm" style={{ color: "#a3b3ae" }}>
          Guides, API reference, and answers to common questions.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "#5a7268" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search help articles…"
          className="w-full pl-10 pr-10 text-sm rounded-lg focus:outline-none focus:ring-2"
          style={{
            backgroundColor: "#0d1211",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#f0f4f3",
            height: 36,
            borderRadius: 8,
            fontFeatureSettings: '"cv01","ss03"',
            "--tw-ring-color": "#1d9e75",
          } as React.CSSProperties}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80"
            style={{ color: "#5a7268" }}
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sections or empty state */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((section) => (
            <Section
              key={section.title}
              title={section.title}
              icon={section.icon}
              items={section.items}
            />
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl px-6 py-16 flex flex-col items-center text-center"
          style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-base font-medium mb-1" style={{ color: "#a3b3ae" }}>
            No results found
          </p>
          <p className="text-sm mb-4" style={{ color: "#5a7268" }}>
            No articles match{" "}
            <span style={{ color: "#f0f4f3" }}>&ldquo;{search}&rdquo;</span>
            . Try a different search term.
          </p>
          <button
            onClick={() => setSearch("")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0 16px",
              height: 36,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#a3b3ae",
              backgroundColor: "transparent",
            }}
          >
            Clear search
          </button>
        </div>
      )}

      {/* Contact form */}
      <div className="mt-6">
        <ContactForm />
      </div>
    </div>
  );
}
