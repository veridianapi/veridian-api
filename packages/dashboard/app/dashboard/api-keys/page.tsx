"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

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
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-semibold" style={{ fontSize: 22, color: "#f0f4f3", letterSpacing: "-0.02em", marginBottom: 4 }}>API Keys</h1>
          <p style={{ fontSize: 13, color: "#5a7268", fontWeight: 400 }}>
            Manage your authentication keys
          </p>
        </div>
        {/* Primary button: bg #1d9e75, text #050a09, h 36px, radius 8px */}
        <button
          onClick={() => {
            setShowForm(!showForm);
            setCreatedKey(null);
          }}
          className="inline-flex items-center gap-2 text-[13px] font-medium hover:opacity-90 active:scale-[0.98]"
          style={{
            backgroundColor: "#1d9e75",
            color: "#050a09",
            height: 36,
            padding: "0 16px",
            borderRadius: 8,
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create new key
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-6 rounded-xl px-5 py-4"
          style={{
            backgroundColor: "rgba(220,38,38,0.10)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderLeft: "3px solid #dc2626",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "#dc2626" }}>{error}</p>
        </div>
      )}

      {/* New key created banner */}
      {createdKey && (
        <div
          className="mb-6 rounded-xl p-5"
          style={{
            backgroundColor: "rgba(29,158,117,0.10)",
            border: "1px solid rgba(29,158,117,0.25)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
              style={{ backgroundColor: "rgba(29,158,117,0.20)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-2" style={{ color: "#1d9e75" }}>
                Key created — copy it now, it won&apos;t be shown again
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 text-xs px-3 py-2 rounded-lg break-all min-w-0"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "rgba(29,158,117,0.10)",
                    color: "#a3b3ae",
                  }}
                >
                  {createdKey}
                </code>
                {/* Secondary button */}
                <button
                  onClick={() => copyToClipboard(createdKey)}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium"
                  style={{
                    border: "1px solid rgba(29,158,117,0.30)",
                    color: "#1d9e75",
                    height: 36,
                    padding: "0 12px",
                    borderRadius: 8,
                  }}
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
        <div
          className="rounded-xl p-6 mb-5"
          style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#f0f4f3" }}>New API Key</h2>
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="Key name (e.g. Production, Staging)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              className="flex-1 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 w-full sm:w-auto"
              style={{
                backgroundColor: "#0d1211",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#f0f4f3",
                height: 36,
                borderRadius: 8,
                fontFeatureSettings: '"cv01","ss03"',
                "--tw-ring-color": "#1d9e75",
              } as React.CSSProperties}
              autoFocus
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="text-[13px] font-medium disabled:opacity-40 hover:opacity-90"
              style={{
                backgroundColor: "#1d9e75",
                color: "#050a09",
                height: 36,
                padding: "0 16px",
                borderRadius: 8,
              }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-[13px] font-medium hover:opacity-80"
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#a3b3ae",
                height: 36,
                padding: "0 16px",
                borderRadius: 8,
                backgroundColor: "transparent",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div
        className="card-lift rounded-xl"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-sm" style={{ color: "#a3b3ae" }}>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading keys…
            </div>
          </div>
        ) : keys.length === 0 ? (
          /* Empty state: icon + headline + description + action (DESIGN.md §8) */
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-base font-medium mb-1" style={{ color: "#a3b3ae" }}>
              No API keys yet
            </p>
            <p className="text-sm mb-4" style={{ color: "#5a7268" }}>
              Create a key to start making API requests.
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "0 16px",
                height: 36,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                backgroundColor: "#1d9e75",
                color: "#050a09",
              }}
            >
              Create API key
            </button>
          </div>
        ) : (
          <div>
            {keys.map((k, i) => (
              <div
                key={k.id}
                className="px-6 py-5 flex items-center gap-4"
                style={{
                  borderBottom:
                    i < keys.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                {/* Key icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "rgba(29,158,117,0.10)" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>

                {/* Key details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#f0f4f3" }}>{k.name}</p>
                </div>

                {/* Meta */}
                <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                  <p style={{ fontSize: 13, color: "#a3b3ae" }}>
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {revokeConfirm === k.id ? (
                    <>
                      <span className="text-xs hidden sm:inline" style={{ color: "#a3b3ae" }}>
                        Revoke this key?
                      </span>
                      {/* Danger button */}
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="text-xs font-medium"
                        style={{
                          backgroundColor: "rgba(220,38,38,0.12)",
                          border: "1px solid rgba(220,38,38,0.25)",
                          color: "#dc2626",
                          height: 32,
                          padding: "0 12px",
                          borderRadius: 8,
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setRevokeConfirm(null)}
                        className="text-xs font-medium hover:opacity-80"
                        style={{
                          border: "1px solid rgba(255,255,255,0.10)",
                          color: "#a3b3ae",
                          height: 32,
                          padding: "0 12px",
                          borderRadius: 8,
                          backgroundColor: "transparent",
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirm(k.id)}
                      className="text-xs font-medium hover:opacity-80"
                      style={{ color: "#dc2626" }}
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
