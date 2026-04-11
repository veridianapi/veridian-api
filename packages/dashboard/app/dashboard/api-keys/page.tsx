"use client";

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
          <h1 className="text-2xl font-bold text-white">API Keys</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a3b3ae" }}>
            Manage your authentication keys
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setCreatedKey(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 active:scale-95 min-h-[44px]"
          style={{ backgroundColor: "#1d9e75" }}
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
          style={{ backgroundColor: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.25)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#f87171" }}>{error}</p>
        </div>
      )}

      {/* New key created banner */}
      {createdKey && (
        <div
          className="mb-6 rounded-xl p-5"
          style={{ backgroundColor: "rgba(29,158,117,0.10)", border: "1px solid rgba(29,158,117,0.25)" }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
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
                  className="flex-1 text-xs font-mono px-3 py-2 rounded-lg break-all min-w-0"
                  style={{ backgroundColor: "rgba(29,158,117,0.10)", color: "#a3b3ae" }}
                >
                  {createdKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg min-h-[44px]"
                  style={{ border: "1px solid rgba(29,158,117,0.30)", color: "#1d9e75" }}
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
        <div
          className="rounded-xl p-6 mb-5"
          style={{ backgroundColor: "#111916", border: "1px solid #1a2b25" }}
        >
          <h2 className="text-sm font-semibold text-white mb-4">New API Key</h2>
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="Key name (e.g. Production, Staging)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              className="flex-1 px-3 py-2.5 text-sm rounded-lg focus:outline-none focus:ring-2 min-h-[44px] w-full sm:w-auto"
              style={{
                backgroundColor: "#0a0f0e",
                border: "1px solid #1a2b25",
                color: "#ffffff",
                "--tw-ring-color": "#1d9e75",
              } as React.CSSProperties}
              autoFocus
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-40 hover:opacity-90 min-h-[44px]"
              style={{ backgroundColor: "#1d9e75" }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 text-sm font-medium rounded-lg hover:opacity-80 min-h-[44px]"
              style={{ border: "1px solid #1a2b25", color: "#a3b3ae" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="rounded-xl" style={{ backgroundColor: "#111916", border: "1px solid #1a2b25" }}>
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
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: "rgba(163,179,174,0.08)" }}
            >
              <svg className="w-6 h-6" fill="none" stroke="#a3b3ae" strokeOpacity="0.4" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "#a3b3ae" }}>No API keys yet</p>
            <p className="text-xs mt-1" style={{ color: "#5a7068" }}>Create a key to start making API requests</p>
          </div>
        ) : (
          <div>
            {keys.map((k, i) => (
              <div
                key={k.id}
                className="px-6 py-5 flex items-center gap-4"
                style={{
                  borderBottom: i < keys.length - 1 ? "1px solid #1a2b25" : "none",
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
                  <p className="text-sm font-semibold text-white">{k.name}</p>
                </div>

                {/* Meta */}
                <div className="hidden sm:flex flex-col items-end text-right shrink-0">
                  <p className="text-xs" style={{ color: "#a3b3ae" }}>
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {revokeConfirm === k.id ? (
                    <>
                      <span className="text-xs hidden sm:inline" style={{ color: "#a3b3ae" }}>Revoke this key?</span>
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white rounded-lg min-h-[44px] md:min-h-0"
                        style={{ backgroundColor: "#dc2626" }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setRevokeConfirm(null)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg min-h-[44px] md:min-h-0"
                        style={{ border: "1px solid #1a2b25", color: "#a3b3ae" }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirm(k.id)}
                      className="text-xs font-medium px-2 py-1 rounded-lg min-h-[44px] md:min-h-0"
                      style={{ color: "#f87171" }}
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
