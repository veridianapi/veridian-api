"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
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
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const supabase = createClient();

  const fetchKeys = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("api_keys")
      .select("id, name, created_at, last_used_at, is_active")
      .eq("customer_id", user!.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setKeys(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Generate a random key
    const raw = `vrd_live_${crypto.randomUUID().replace(/-/g, "")}`;

    // Hash it for storage
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(raw)
    );
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await supabase.from("api_keys").insert({
      customer_id: user!.id,
      name: newKeyName.trim(),
      key_hash: keyHash,
      is_active: true,
    });

    setCreatedKey(raw);
    setNewKeyName("");
    setCreating(false);
    setShowForm(false);
    fetchKeys();
  }

  async function revokeKey(id: string) {
    await supabase.from("api_keys").update({ is_active: false }).eq("id", id);
    setRevokeConfirm(null);
    fetchKeys();
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function maskKey(key: string) {
    // Show prefix + last 4 chars: vrd_live_••••••••xxxx
    const parts = key.split("_");
    const prefix = parts.slice(0, 2).join("_");
    const raw = parts.slice(2).join("_");
    const last4 = raw.slice(-4);
    return `${prefix}_${"•".repeat(8)}${last4}`;
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage your authentication keys
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setCreatedKey(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:opacity-90 active:scale-95"
          style={{ backgroundColor: "#0f6e56" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create new key
        </button>
      </div>

      {/* New key created banner */}
      {createdKey && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800 mb-2">
                Key created — copy it now, it won&apos;t be shown again
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-green-100 px-3 py-2 rounded-lg break-all text-green-900 min-w-0">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-green-300 text-green-700 hover:bg-green-100 transition-all duration-150"
                >
                  <CopyIcon />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create new key form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">New API Key</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Key name (e.g. Production, Staging)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all duration-150"
              style={{ "--tw-ring-color": "#0f6e56" } as React.CSSProperties}
              autoFocus
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-40 transition-all duration-150 hover:opacity-90"
              style={{ backgroundColor: "#0f6e56" }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-150"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading keys…
            </div>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-400">No API keys yet</p>
            <p className="text-xs text-gray-300 mt-1">Create a key to start making API requests</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {keys.map((k) => (
              <div
                key={k.id}
                className="px-6 py-5 flex items-center gap-4 hover:bg-gray-50/50 transition-all duration-150"
              >
                {/* Key icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(15,110,86,0.08)" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="#0f6e56" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>

                {/* Key details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{k.name}</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    {maskKey(`vrd_live_${k.id.replace(/-/g, "").slice(0, 16)}`)}
                  </p>
                </div>

                {/* Meta */}
                <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {k.last_used_at
                      ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}`
                      : "Never used"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {revokeConfirm === k.id ? (
                    <>
                      <span className="text-xs text-gray-500 hidden sm:inline">Revoke this key?</span>
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all duration-150"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setRevokeConfirm(null)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-150"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirm(k.id)}
                      className="text-xs font-medium text-red-400 hover:text-red-600 transition-all duration-150 px-2 py-1 rounded-lg hover:bg-red-50"
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
