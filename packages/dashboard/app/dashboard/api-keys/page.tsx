"use client";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error: fetchError } = await supabase
        .from("api_keys").select("id, name, created_at").eq("customer_id", user.id)
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

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const raw = `vrd_live_${crypto.randomUUID().replace(/-/g, "")}`;
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
      const keyHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

      const { error: insertError } = await supabase.from("api_keys").insert({
        customer_id: user.id, name: newKeyName.trim(), key_hash: keyHash,
      });
      if (insertError) throw insertError;

      setCreatedKey(raw);
      setNewKeyName("");
      setShowForm(false);
      fetchKeys();
    } catch (err) {
      setError(`Failed to create API key — ${err instanceof Error ? err.message : String(err)}`);
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

      {error && (
        <div className="p-4 mb-5 rounded-lg bg-[#ef4444]/[0.08] border-l-[3px] border-[#ef4444]">
          <p className="text-sm font-medium text-[#ef4444]">{error}</p>
        </div>
      )}

      {/* New key created banner */}
      {createdKey && (
        <div className="p-4 mb-5 rounded-xl bg-[#10b981]/[0.08] border border-[#10b981]/[0.20]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#10b981]/[0.12] flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-2 text-[#10b981]">
                Key created — copy it now, it won&apos;t be shown again
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#0d1211] border border-white/[0.08] text-[#a8ff78] font-mono break-all min-w-0">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdKey)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 border border-white/10 text-[#94a3b8] text-xs font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors shrink-0"
                >
                  <CopyIcon />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 mb-5">
          <h2 className="text-sm font-semibold text-[#f8fafc] mb-4">New API Key</h2>
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="Key name (e.g. Production, Staging)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              className="bg-[#0d1211] border border-white/[0.08] rounded-lg h-9 px-3 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#1d9e75] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/15 transition-colors flex-1 w-full sm:w-auto"
              autoFocus
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="inline-flex items-center h-9 px-4 bg-[#1d9e75] text-[#050a09] text-[13px] font-medium rounded-lg hover:bg-[#22c55e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="inline-flex items-center h-9 px-4 border border-white/10 text-[#94a3b8] text-[13px] font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-sm text-[#64748b]">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading keys…
            </div>
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            icon={<svg className="w-5 h-5" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
            title="No API keys yet"
            description="Create a key to start making API requests."
            action={<PrimaryButton onClick={() => setShowForm(true)}>Create API key</PrimaryButton>}
          />
        ) : (
          <div>
            {keys.map((k) => (
              <div key={k.id} className="px-5 py-4 flex items-center gap-4 border-b border-white/[0.04] last:border-0">
                <div className="w-9 h-9 rounded-lg bg-[#1d9e75]/[0.10] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f8fafc]">{k.name}</p>
                  <p className="text-[11px] font-mono text-[#64748b] mt-0.5">vrd_live_••••••••</p>
                </div>

                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-xs text-[#64748b]">Created {new Date(k.created_at).toLocaleDateString()}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {revokeConfirm === k.id ? (
                    <>
                      <span className="text-xs hidden sm:inline text-[#94a3b8]">Revoke this key?</span>
                      <button
                        onClick={() => revokeKey(k.id)}
                        className="inline-flex items-center h-7 px-3 bg-[#ef4444]/[0.12] border border-[#ef4444]/[0.25] text-[#ef4444] text-xs font-medium rounded-lg hover:bg-[#ef4444]/[0.20] transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setRevokeConfirm(null)}
                        className="inline-flex items-center h-7 px-3 border border-white/10 text-[#94a3b8] text-xs font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirm(k.id)}
                      className="inline-flex items-center h-7 px-3 text-[#64748b] text-xs font-medium rounded-lg hover:bg-white/[0.04] hover:text-[#ef4444] transition-colors"
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
