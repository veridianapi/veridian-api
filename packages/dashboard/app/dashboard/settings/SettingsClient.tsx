"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase";
import { deleteAccount } from "./actions";
import { PageHeader } from "../_components/PageHeader";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[#f8fafc]">{title}</h2>
        {description && <p className="text-xs text-[#64748b] mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

const inputCls = "bg-[#0d1211] border border-white/[0.08] rounded-lg h-9 px-3 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#1d9e75] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/15 transition-colors w-full";
const labelCls = "block text-xs font-medium text-[#64748b] uppercase tracking-[0.04em] mb-1.5";
const btnPrimary = "inline-flex items-center h-9 px-4 bg-[#1d9e75] text-[#050a09] text-[13px] font-medium rounded-lg hover:bg-[#22c55e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const btnSecondary = "inline-flex items-center h-9 px-4 border border-white/10 text-[#94a3b8] text-[13px] font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors disabled:opacity-60";

export default function SettingsClient({ email }: { email: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  const [signOutStatus, setSignOutStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const [deletePhase, setDeletePhase] = useState<"idle" | "confirm">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSignOutOthers() {
    setSignOutStatus("loading");
    setSignOutError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) { setSignOutError(error.message); setSignOutStatus("error"); }
    else setSignOutStatus("done");
  }

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === email) return;
    setEmailStatus("sending");
    setEmailError(null);
    const supabase = createClient();
    const target = newEmail.trim();
    const { error } = await supabase.auth.updateUser({ email: target });
    if (error) { setEmailError(error.message); setEmailStatus("error"); }
    else { setSentToEmail(target); setEmailStatus("sent"); setNewEmail(""); }
  }

  function handleDeleteConfirm() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result && "error" in result) { setDeleteError(result.error); setDeletePhase("idle"); }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account preferences" />

      {/* Account */}
      <Section title="Account" description="Your account details and authentication email">
        <div className="mb-4">
          <label className={labelCls}>Current email</label>
          <p className="text-sm text-[#f8fafc]">{email}</p>
        </div>
        <form onSubmit={handleEmailUpdate} className="space-y-4">
          <div>
            <label htmlFor="new-email" className={labelCls}>Update email</label>
            <input
              id="new-email" type="email" value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setEmailStatus("idle"); setEmailError(null); }}
              placeholder="new@email.com"
              className={inputCls}
            />
          </div>
          {emailError && (
            <p className="text-xs px-3 py-2 rounded-lg bg-[#ef4444]/[0.08] border-l-[3px] border-[#ef4444] text-[#ef4444]">{emailError}</p>
          )}
          {emailStatus === "sent" && (
            <p className="text-xs px-3 py-2 rounded-lg bg-[#10b981]/[0.08] border-l-[3px] border-[#10b981] text-[#10b981]">
              Confirmation email sent to <span className="font-medium">{sentToEmail}</span> — check that inbox to complete the change.
            </p>
          )}
          <button type="submit" disabled={emailStatus === "sending" || !newEmail.trim()} className={btnPrimary}>
            {emailStatus === "sending" ? "Sending…" : "Send confirmation"}
          </button>
        </form>
      </Section>

      {/* Security */}
      <Section title="Security" description="Sessions, authentication, and key protection">
        {/* Active sessions */}
        <div className="flex items-center justify-between gap-4 pb-5 mb-5 border-b border-white/[0.06]">
          <div>
            <p className="text-sm font-medium text-[#f8fafc] mb-1">Active sessions</p>
            <p className="text-xs text-[#64748b]">Device: Current browser session</p>
            <p className="text-xs mt-0.5 text-[#64748b]">Last active: Just now</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              <span className="text-xs text-[#10b981]">Active</span>
            </div>
          </div>
          <button
            onClick={handleSignOutOthers}
            disabled={signOutStatus === "loading" || signOutStatus === "done"}
            className={`${btnSecondary} shrink-0`}
          >
            {signOutStatus === "loading" ? "Signing out…" : signOutStatus === "done" ? "Done" : "Sign out all other sessions"}
          </button>
        </div>

        {signOutStatus === "done" && (
          <p className="text-xs px-3 py-2 rounded-lg bg-[#10b981]/[0.08] border-l-[3px] border-[#10b981] text-[#10b981] -mt-3 mb-5">
            All other sessions signed out.
          </p>
        )}
        {signOutStatus === "error" && signOutError && (
          <p className="text-xs px-3 py-2 rounded-lg bg-[#ef4444]/[0.08] border-l-[3px] border-[#ef4444] text-[#ef4444] -mt-3 mb-5">{signOutError}</p>
        )}

        {/* 2FA */}
        <div className="flex items-center justify-between gap-4 pb-5 mb-5 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-[#f8fafc]">Two-factor authentication</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-[#f59e0b] bg-[#f59e0b]/[0.12]">Not enabled</span>
            </div>
            <p className="text-xs text-[#64748b]">Add an extra layer of security to your account.</p>
          </div>
          <button disabled className="inline-flex items-center h-9 px-4 border border-white/[0.06] text-[#64748b] text-[13px] font-medium rounded-lg cursor-not-allowed shrink-0">
            Coming soon
          </button>
        </div>

        {/* API key security */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-[#f8fafc]">API key security</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-[#10b981] bg-[#10b981]/[0.12]">Secure</span>
            </div>
            <p className="text-xs text-[#64748b]">Your API keys are hashed with SHA-256. Raw keys are shown only once and never stored.</p>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" description="Customize how the dashboard looks">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#f8fafc] mb-1">Theme</p>
            <p className="text-xs text-[#64748b]">Dark (default)</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1d9e75]/[0.10] border border-[#1d9e75]/[0.20]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1d9e75]" />
            <span className="text-[11px] font-medium text-[#1d9e75]">Selected</span>
          </div>
        </div>
        <p className="text-xs mt-4 text-[#64748b]">More appearance options coming soon.</p>
      </Section>

      {/* Danger zone */}
      <div className="bg-[#ef4444]/[0.04] border border-[#ef4444]/[0.15] rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[#ef4444]">Danger zone</h2>
          <p className="text-xs text-[#64748b] mt-1">Permanent actions — these cannot be undone.</p>
        </div>

        {deletePhase === "idle" ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#f8fafc]">Delete account</p>
              <p className="text-xs mt-1 text-[#64748b]">Permanently remove your account and all associated data.</p>
            </div>
            <button
              onClick={() => setDeletePhase("confirm")}
              className="inline-flex items-center h-9 px-4 border border-[#ef4444]/[0.30] text-[#ef4444] text-[13px] font-medium rounded-lg hover:bg-[#ef4444]/[0.08] transition-colors shrink-0"
            >
              Delete account
            </button>
          </div>
        ) : (
          <div className="bg-[#ef4444]/[0.06] border border-[#ef4444]/[0.20] rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-[#ef4444]">Are you sure? This is permanent.</p>
            <p className="text-xs text-[#64748b]">Your account, API keys, and all data will be deleted immediately. There is no recovery.</p>
            {deleteError && (
              <p className="text-xs px-3 py-2 rounded-lg bg-[#ef4444]/[0.08] border-l-[3px] border-[#ef4444] text-[#ef4444]">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="inline-flex items-center h-9 px-4 bg-[#ef4444] text-white text-[13px] font-medium rounded-lg hover:bg-[#dc2626] transition-colors disabled:opacity-60"
              >
                {isPending ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                onClick={() => { setDeletePhase("idle"); setDeleteError(null); }}
                disabled={isPending}
                className={btnSecondary}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
