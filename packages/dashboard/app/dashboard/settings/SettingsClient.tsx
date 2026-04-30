"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase";
import { deleteAccount } from "./actions";
import { PageHeader } from "../_components/PageHeader";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="vd-settings-section">
      <div className="mb-4">
        <h2 className="text-sm font-semibold vd-text-primary">{title}</h2>
        {description && <p className="vd-section-desc text-xs mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsClient({ email }: { email: string }) {
  // Email update
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Sign out other sessions
  const [signOutStatus, setSignOutStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  // Delete account
  const [deletePhase, setDeletePhase] = useState<"idle" | "confirm">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSignOutOthers() {
    setSignOutStatus("loading");
    setSignOutError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "others" });
    if (error) {
      setSignOutError(error.message);
      setSignOutStatus("error");
    } else {
      setSignOutStatus("done");
    }
  }

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === email) return;
    setEmailStatus("sending");
    setEmailError(null);

    const supabase = createClient();
    const target = newEmail.trim();
    const { error } = await supabase.auth.updateUser({ email: target });
    if (error) {
      setEmailError(error.message);
      setEmailStatus("error");
    } else {
      setSentToEmail(target);
      setEmailStatus("sent");
      setNewEmail("");
    }
  }

  function handleDeleteConfirm() {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result && "error" in result) {
        setDeleteError(result.error);
        setDeletePhase("idle");
      }
      // On success, server action redirects to /login
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account preferences" />

      {/* Account */}
      <Section title="Account" description="Your account details and authentication email">
        <div className="mb-4">
          <label className="vd-field-label-block">Current email</label>
          <p className="vd-field-read text-sm">{email}</p>
        </div>

        <form onSubmit={handleEmailUpdate} className="space-y-4">
          <div>
            <label htmlFor="new-email" className="vd-field-label-block">
              Update email
            </label>
            <input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setEmailStatus("idle");
                setEmailError(null);
              }}
              placeholder="new@email.com"
              className="vd-input w-full focus:ring-2"
            />
          </div>

          {emailError && (
            <p className="vd-inline-error text-xs px-3 py-2 rounded-lg">{emailError}</p>
          )}

          {emailStatus === "sent" && (
            <p className="vd-inline-success text-xs px-3 py-2 rounded-lg">
              Confirmation email sent to{" "}
              <span className="font-medium">{sentToEmail}</span> — check that inbox to complete the change.
            </p>
          )}

          <button
            type="submit"
            disabled={emailStatus === "sending" || !newEmail.trim()}
            className="vd-btn vd-btn-primary disabled:opacity-50"
          >
            {emailStatus === "sending" ? "Sending…" : "Send confirmation"}
          </button>
        </form>
      </Section>

      {/* Security */}
      <Section title="Security" description="Sessions, authentication, and key protection">
        {/* Active sessions */}
        <div className="vd-security-divider flex items-center justify-between gap-4 pb-5 mb-5">
          <div>
            <p className="text-sm font-medium mb-1 vd-text-primary">Active sessions</p>
            <p className="text-xs vd-text-tertiary">Device: Current browser session</p>
            <p className="text-xs mt-0.5 vd-text-tertiary">Last active: Just now</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="vd-status-active-dot" />
              <span className="vd-status-active-label">Active</span>
            </div>
          </div>
          <button
            onClick={handleSignOutOthers}
            disabled={signOutStatus === "loading" || signOutStatus === "done"}
            className="vd-btn-outline shrink-0 disabled:opacity-50"
          >
            {signOutStatus === "loading"
              ? "Signing out…"
              : signOutStatus === "done"
              ? "Done"
              : "Sign out all other sessions"}
          </button>
        </div>

        {signOutStatus === "done" && (
          <p className="vd-inline-success text-xs px-3 py-2 rounded-lg -mt-3 mb-5">
            All other sessions signed out.
          </p>
        )}

        {signOutStatus === "error" && signOutError && (
          <p className="vd-inline-error text-xs px-3 py-2 rounded-lg -mt-3 mb-5">
            {signOutError}
          </p>
        )}

        {/* Two-factor authentication */}
        <div className="vd-security-divider flex items-center justify-between gap-4 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium vd-text-primary">Two-factor authentication</p>
              <span className="vd-badge-warn-sm">Not enabled</span>
            </div>
            <p className="text-xs vd-text-tertiary">Add an extra layer of security to your account.</p>
          </div>
          <button disabled className="vd-btn-disabled-look shrink-0">
            Coming soon
          </button>
        </div>

        {/* API key security */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium vd-text-primary">API key security</p>
              <span className="vd-badge-ok-sm">Secure</span>
            </div>
            <p className="text-xs vd-text-tertiary">
              Your API keys are hashed with SHA-256. Raw keys are shown only once and never stored.
            </p>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" description="Customize how the dashboard looks">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium mb-1 vd-text-primary">Theme</p>
            <p className="text-xs vd-text-tertiary">Dark (default)</p>
          </div>
          <div className="vd-theme-selected">
            <span className="vd-theme-dot" />
            <span className="vd-theme-label">Selected</span>
          </div>
        </div>
        <p className="text-xs mt-4 vd-text-tertiary">More appearance options coming soon.</p>
      </Section>

      {/* Danger zone */}
      <div className="vd-danger-section">
        <div className="mb-4">
          <h2 className="text-sm font-semibold vd-danger-title">Danger zone</h2>
          <p className="vd-section-desc text-xs mt-1">Permanent actions — these cannot be undone.</p>
        </div>

        {deletePhase === "idle" ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium vd-text-primary">Delete account</p>
              <p className="text-xs mt-1 vd-text-tertiary">
                Permanently remove your account and all associated data.
              </p>
            </div>
            <button
              onClick={() => setDeletePhase("confirm")}
              className="vd-btn vd-btn-danger shrink-0 vd-btn-delete-outline"
            >
              Delete account
            </button>
          </div>
        ) : (
          <div className="vd-danger-confirm rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium vd-danger-title">Are you sure? This is permanent.</p>
            <p className="text-xs vd-text-tertiary">
              Your account, API keys, and all data will be deleted immediately. There is no recovery.
            </p>

            {deleteError && (
              <p className="vd-inline-error text-xs px-3 py-2 rounded-lg">{deleteError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="vd-btn vd-btn-delete disabled:opacity-60"
              >
                {isPending ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                onClick={() => {
                  setDeletePhase("idle");
                  setDeleteError(null);
                }}
                disabled={isPending}
                className="vd-btn vd-btn-secondary disabled:opacity-60"
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
