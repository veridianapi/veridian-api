"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "../_components/PageHeader";
import { PrimaryButton } from "../_components/PrimaryButton";
import { EmptyState } from "../_components/EmptyState";

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/login");
    });
  }, [supabase, router]);

  const fetchKeys = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: fetchError } = await supabase
        .from("api_keys")
        .select("id, name, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setKeys(data ?? []);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(NEXT_PUBLIC_SUPABASE_URL not set)";
      setError(`Failed to load API keys from ${supabaseUrl} — ${detail}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const raw = `vrd_live_${crypto.randomUUID().replace(/-/g, "")}`;

      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(raw)
      );
      const keyHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const { error: insertError } = await supabase.from("api_keys").insert({
        customer_id: user.id,
        name: newKeyName.trim(),
        key_hash: keyHash,
      });
      if (insertError) throw insertError;

      setCreatedKey(raw);
      setNewKeyName("");
      setShowForm(false);
      fetchKeys();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Failed to create API key — ${detail}`);
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    await supabase.from("api_keys").delete().eq("id", id);
    setRevokeConfirm(null);
    fetchKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <PageHeader
        title="API Keys"
        subtitle="Manage your authentication keys"
        action={
          <PrimaryButton onClick={() => { setShowForm(!showForm); setCreatedKey(null); }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create new key
          </PrimaryButton>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="vd-alert vd-alert-danger">
          <p className="text-sm font-medium vd-text-danger">{error}</p>
        </div>
      )}

      {/* New key created banner */}
      {createdKey && (
        <div className="vd-alert vd-alert-success mb-5">
          <div className="flex items-start gap-3">
            <div className="vd-icon-brand-sm w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-2 vd-text-brand">
                Key created — copy it now, it won&apos;t be shown again
              </p>
              <div className="flex items-center gap-2">
                <code className="vd-key-code flex-1 text-xs px-3 py-2 rounded-lg break-all min-w-0">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey)}
                  className="vd-btn vd-btn-secondary vd-btn-sm shrink-0 vd-key-copy-btn"
                >
                  <CopyIcon />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create new key form */}
      {showForm && (
        <div className="vd-card mb-5">
          <h2 className="vd-card-title mb-4">New API Key</h2>
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="Key name (e.g. Production, Staging)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              className="vd-input flex-1 w-full sm:w-auto"
              autoFocus
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="vd-btn vd-btn-primary"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="vd-btn vd-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="vd-card-bare">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-sm vd-loading-text">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading keys…
            </div>
          </div>
        ) : keys.length === 0 ? (          <EmptyState
            icon={
              <svg className="w-5 h-5" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            }
            title="No API keys yet"
            description="Create a key to start making API requests."
            action={<PrimaryButton onClick={() => setShowForm(true)}>Create API key</PrimaryButton>}
          />
        ) : (
          <div className="vd-key-list">
            {keys.map((k) => (
              <div
                key={k.id}
                className="px-6 py-5 flex items-center gap-4"
              >
                {/* Key icon */}
                <div className="vd-icon-brand-xs w-9 h-9 rounded-lg flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>

                {/* Key details */}
                <div className="flex-1 min-w-0">
                  <p className="vd-table-primary text-sm">{k.name}</p>
                  <p className="vd-key-mono mt-0.5">vrd_live_••••••••</p>
                </div>

                {/* Created date */}
                <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                  <p className="vd-key-date">
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {revokeConfirm === k.id ? (
                    <>
                      <span className="text-xs hidden sm:inline vd-text-secondary">
                        Revoke this key?
                      </span>
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="vd-btn vd-btn-danger vd-btn-sm"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setRevokeConfirm(null)}
                        className="vd-btn vd-btn-secondary vd-btn-sm"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirm(k.id)}
                      className="vd-btn vd-btn-ghost vd-btn-sm vd-revoke-btn"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
