"use client";

import { useState, useTransition } from "react";
import { sendSupportEmail } from "./actions";
import { PageHeader } from "../_components/PageHeader";

const SECTIONS = [
  {
    title: "Getting started",
    icon: (
      <svg className="w-4 h-4 shrink-0 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <svg className="w-4 h-4 shrink-0 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <svg className="w-4 h-4 shrink-0 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

const SUBJECTS = ["Technical issue", "Billing question", "Feature request", "Other"];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full px-5 py-4 text-left gap-4 hover:bg-white/[0.02] transition-colors"
      >
        <span className={`text-sm font-medium leading-snug ${open ? "text-[#f8fafc]" : "text-[#94a3b8]"}`}>
          {q}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-[#64748b] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5">
          {a.split("\n").map((line, i) =>
            line === "" ? (
              <div key={i} className="h-2" />
            ) : line.startsWith("•") || line.startsWith("POST") || line.startsWith("GET") ||
               line.startsWith("{") || line.startsWith("}") || line.startsWith("  ") ||
               line.startsWith("Authorization") || line.startsWith("Content-Type") ? (
              <p key={i} className="font-mono text-xs text-[#a8ff78] leading-relaxed">{line}</p>
            ) : (
              <p key={i} className="text-sm text-[#94a3b8] leading-relaxed">{line}</p>
            )
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, items }: { title: string; icon: React.ReactNode; items: { q: string; a: string }[] }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
        {icon}
        <h2 className="text-sm font-semibold text-[#f8fafc]">{title}</h2>
      </div>
      {items.map((item) => <AccordionItem key={item.q} q={item.q} a={item.a} />)}
    </div>
  );
}

function ContactForm() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const charCount = message.length;
  const tooShort = charCount > 0 && charCount < 100;
  const canSubmit = charCount >= 100 && !isPending;

  const inputCls = "bg-[#0d1211] border border-white/[0.08] rounded-lg h-9 px-3 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#1d9e75] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/15 transition-colors w-full";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("idle");
    setErrorMsg("");
    startTransition(async () => {
      const result = await sendSupportEmail({ subject, message });
      if (result.ok) { setStatus("success"); setMessage(""); setSubject(SUBJECTS[0]); }
      else { setStatus("error"); setErrorMsg(result.error); }
    });
  }

  if (status === "success") {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-10 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full bg-[#10b981]/[0.12] flex items-center justify-center mb-4">
          <svg className="w-5 h-5" fill="none" stroke="#10b981" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-base font-medium text-[#f8fafc] mb-1">Message sent</p>
        <p className="text-sm text-[#64748b] mb-5">We typically reply within a few hours.</p>
        <button onClick={() => setStatus("idle")}
          className="inline-flex items-center h-9 px-4 border border-white/10 text-[#94a3b8] text-[13px] font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
        <svg className="w-4 h-4 shrink-0 text-[#1d9e75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 className="text-sm font-semibold text-[#f8fafc]">Contact support</h2>
        <span className="text-xs text-[#64748b]">— we usually reply within a few hours</span>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label htmlFor="support-subject" className="block text-xs font-medium text-[#64748b] mb-1.5">Subject</label>
          <select id="support-subject" value={subject} onChange={(e) => setSubject(e.target.value)}
            className={`${inputCls} appearance-none`}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label htmlFor="support-message" className="text-xs font-medium text-[#64748b]">Message</label>
            <span className={`text-xs ${tooShort ? "text-[#ef4444]" : charCount >= 100 ? "text-[#10b981]" : "text-[#64748b]"}`}>
              {charCount}/100 min
            </span>
          </div>
          <textarea
            id="support-message" value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue or question in detail…" rows={5}
            className={`bg-[#0d1211] border rounded-lg px-3 py-2.5 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/15 transition-colors w-full resize-none ${tooShort ? "border-[#ef4444]/[0.50] focus:border-[#ef4444]" : "border-white/[0.08] focus:border-[#1d9e75]"}`}
          />
          {tooShort && (
            <p className="mt-1.5 text-xs text-[#f59e0b]">Please write at least 100 characters so we can help you effectively.</p>
          )}
        </div>

        {status === "error" && (
          <div className="p-3 rounded-lg bg-[#ef4444]/[0.08] border-l-[3px] border-[#ef4444]">
            <p className="text-sm text-[#ef4444]">{errorMsg}</p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button type="submit" disabled={!canSubmit}
            className="inline-flex items-center gap-2 h-9 px-4 bg-[#1d9e75] text-[#050a09] text-[13px] font-medium rounded-lg hover:bg-[#22c55e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {isPending ? (
              <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Send message</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function HelpPage() {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? SECTIONS.map((s) => ({ ...s, items: s.items.filter((item) => item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())) })).filter((s) => s.items.length > 0)
    : SECTIONS;

  return (
    <div className="max-w-2xl">
      <PageHeader title="How can we help?" subtitle="Guides, API reference, and answers to common questions." />

      <div className="relative mb-8">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[#64748b]"
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search help articles…"
          className="bg-[#0d1211] border border-white/[0.08] rounded-lg h-9 pl-9 pr-10 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#1d9e75] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/15 transition-colors w-full"
        />
        {search && (
          <button onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8] transition-colors"
            aria-label="Clear search">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((section) => (
            <Section key={section.title} title={section.title} icon={section.icon} items={section.items} />
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-6 py-16 flex flex-col items-center text-center">
          <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center mb-4">
            <svg className="w-4 h-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-base font-medium text-[#94a3b8] mb-1">No results found</p>
          <p className="text-sm text-[#64748b] mb-4">
            No articles match <span className="text-[#f8fafc]">&ldquo;{search}&rdquo;</span>. Try a different search term.
          </p>
          <button onClick={() => setSearch("")}
            className="inline-flex items-center h-9 px-4 border border-white/10 text-[#94a3b8] text-[13px] font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors">
            Clear search
          </button>
        </div>
      )}

      <div className="mt-6">
        <ContactForm />
      </div>
    </div>
  );
}
