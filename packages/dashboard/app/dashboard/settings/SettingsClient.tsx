"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase";
import { deleteAccount } from "./actions";

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
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: "#111916", border: "1px solid #1a2b25" }}
    >
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "#6b8078" }}>
            {description}
          </p>
        )}
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

  // Delete account
  const [deletePhase, setDeletePhase] = useState<"idle" | "confirm">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || newEmail === email) return;
    setEmailStatus("sending");
    setEmailError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      setEmailError(error.message);
      setEmailStatus("error");
    } else {
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
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm mt-1" style={{ color: "#6b8078" }}>
          Manage your account preferences
        </p>
      </div>

      {/* Account */}
      <Section title="Account" description="Your account details and authentication email">
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1" style={{ color: "#a3b3ae" }}>
            Current email
          </label>
          <p
            className="text-sm px-3 py-2 rounded-lg"
            style={{ backgroundColor: "#0a0f0e", color: "#ffffff", border: "1px solid #1a2b25" }}
          >
            {email}
          </p>
        </div>

        <form onSubmit={handleEmailUpdate} className="space-y-3">
          <div>
            <label htmlFor="new-email" className="block text-xs font-medium mb-1" style={{ color: "#a3b3ae" }}>
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
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "#0a0f0e",
                border: "1px solid #1a2b25",
                color: "#ffffff",
                "--tw-ring-color": "#1d9e75",
              } as React.CSSProperties}
            />
          </div>

          {emailError && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ color: "#f87171", backgroundColor: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.20)" }}
            >
              {emailError}
            </p>
          )}

          {emailStatus === "sent" && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ color: "#1d9e75", backgroundColor: "rgba(29,158,117,0.10)", border: "1px solid rgba(29,158,117,0.20)" }}
            >
              Confirmation sent — check your new inbox to complete the change.
            </p>
          )}

          <button
            type="submit"
            disabled={emailStatus === "sending" || !newEmail.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#1d9e75" }}
          >
            {emailStatus === "sending" ? "Sending…" : "Send confirmation"}
          </button>
        </form>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" description="Customize how the dashboard looks">
        <p className="text-sm" style={{ color: "#5a7068" }}>
          Appearance options coming soon.
        </p>
      </Section>

      {/* Danger zone */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(220,38,38,0.25)" }}
      >
        <div className="mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "#f87171" }}>
            Danger zone
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#6b8078" }}>
            Permanent actions — these cannot be undone.
          </p>
        </div>

        {deletePhase === "idle" ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Delete account</p>
              <p className="text-xs mt-0.5" style={{ color: "#6b8078" }}>
                Permanently remove your account and all associated data.
              </p>
            </div>
            <button
              onClick={() => setDeletePhase("confirm")}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                color: "#f87171",
                border: "1px solid rgba(220,38,38,0.35)",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(153,27,27,0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
              }}
            >
              Delete account
            </button>
          </div>
        ) : (
          <div
            className="rounded-lg p-4 space-y-3"
            style={{ backgroundColor: "rgba(153,27,27,0.12)", border: "1px solid rgba(220,38,38,0.20)" }}
          >
            <p className="text-sm font-medium" style={{ color: "#f87171" }}>
              Are you sure? This is permanent.
            </p>
            <p className="text-xs" style={{ color: "#6b8078" }}>
              Your account, API keys, and all data will be deleted immediately. There is no recovery.
            </p>

            {deleteError && (
              <p className="text-xs" style={{ color: "#f87171" }}>
                {deleteError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: "#dc2626" }}
              >
                {isPending ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button
                onClick={() => {
                  setDeletePhase("idle");
                  setDeleteError(null);
                }}
                disabled={isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
                style={{ color: "#a3b3ae" }}
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
