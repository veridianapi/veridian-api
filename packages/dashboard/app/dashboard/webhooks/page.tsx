"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "../_components/PageHeader";
import { EmptyState } from "../_components/EmptyState";

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  verification_id: string | null;
  event: string;
  status_code: number | null;
  response_body: string | null;
  success: boolean;
  attempted_at: string;
}

function EventBadge({ event }: { event: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-[#1d9e75] bg-[#1d9e75]/[0.10]">
      {event}
    </span>
  );
}

function DeliveryStatus({ success, statusCode }: { success: boolean; statusCode: number | null }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${success ? "text-[#10b981]" : "text-[#ef4444]"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${success ? "bg-[#10b981]" : "bg-[#ef4444]"}`} />
      {statusCode ?? (success ? "200" : "failed")}
    </span>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      aria-checked={enabled}
      role="switch"
      className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${enabled ? "bg-[#1d9e75]/[0.20] border border-[#1d9e75]/[0.40]" : "bg-white/[0.06] border border-white/[0.10]"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-150 ${enabled ? "left-4 bg-[#1d9e75]" : "left-0.5 bg-[#64748b]"}`} />
    </button>
  );
}

const AVAILABLE_EVENTS = ["verification.completed", "verification.failed"];

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [endpointUrl, setEndpointUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["verification.completed", "verification.failed"]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<{ endpointId: string; secret: string } | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function getToken(): Promise<string> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated — please sign in again");
    return session.access_token;
  }

  async function apiFetch<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }
    return res.json();
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [eps, dels] = await Promise.all([
        apiFetch<WebhookEndpoint[]>("GET", "/v1/webhooks"),
        apiFetch<WebhookDelivery[]>("GET", "/v1/webhooks/deliveries"),
      ]);
      setEndpoints(eps ?? []);
      setDeliveries(dels ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!endpointUrl.trim() || selectedEvents.length === 0) return;
    setCreating(true);
    setCreateError(null);
    setNewSecret(null);
    try {
      const result = await apiFetch<WebhookEndpoint & { secret: string }>("POST", "/v1/webhooks", {
        url: endpointUrl.trim(), events: selectedEvents,
      });
      if (!result) throw new Error("No response from server");
      const { secret, ...endpoint } = result;
      setEndpoints((prev) => [endpoint, ...prev]);
      setNewSecret({ endpointId: endpoint.id, secret });
      setEndpointUrl("");
      setSelectedEvents(["verification.completed", "verification.failed"]);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create endpoint");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await apiFetch("DELETE", `/v1/webhooks/${id}`);
      setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    setEndpoints((prev) => prev.map((ep) => (ep.id === id ? { ...ep, enabled } : ep)));
    const supabase = createClient();
    await supabase.from("webhook_endpoints").update({ enabled }).eq("id", id);
  }

  function copySecret() {
    if (!newSecret) return;
    navigator.clipboard.writeText(newSecret.secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  }

  const endpointById = Object.fromEntries(endpoints.map((ep) => [ep.id, ep]));

  return (
    <div>
      <PageHeader title="Webhooks" subtitle="Receive real-time notifications when verifications complete" />

      {loadError && (
        <div className="p-4 mb-5 rounded-lg bg-[#ef4444]/[0.08] border-l-[3px] border-[#ef4444]">
          <p className="text-sm font-medium text-[#ef4444]">{loadError}</p>
        </div>
      )}

      {/* Secret shown once */}
      {newSecret && (
        <div className="p-4 mb-5 rounded-xl bg-[#f59e0b]/[0.08] border border-[#f59e0b]/[0.20]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/[0.12] flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="#f59e0b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-3 text-[#f59e0b]">
                Save this secret now — it won&apos;t be shown again
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="flex-1 text-xs px-3 py-2 rounded-lg bg-[#0d1211] border border-white/[0.08] text-[#a8ff78] font-mono break-all min-w-0">
                  {newSecret.secret}
                </code>
                <button
                  onClick={copySecret}
                  className="inline-flex items-center gap-1.5 h-8 px-3 border border-[#f59e0b]/[0.30] text-[#f59e0b] text-xs font-medium rounded-lg hover:bg-[#f59e0b]/[0.10] transition-colors shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {secretCopied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => setNewSecret(null)}
                  className="inline-flex items-center h-8 px-3 text-[#64748b] text-xs font-medium hover:text-[#94a3b8] transition-colors shrink-0"
                >
                  Dismiss
                </button>
              </div>
              <p className="mt-2 text-xs text-[#94a3b8]">
                Use this secret to verify{" "}
                <code className="font-mono text-[#1d9e75]">X-Veridian-Signature</code>{" "}
                on incoming requests.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create endpoint */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 mb-5">
        <h2 className="text-sm font-semibold text-[#f8fafc] mb-5">Add endpoint</h2>
        <form onSubmit={handleCreate}>
          <div className="mb-4">
            <label htmlFor="webhook-url" className="block text-xs font-medium text-[#64748b] mb-1.5">Endpoint URL</label>
            <input
              id="webhook-url" type="url" value={endpointUrl} onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://yourapp.com/webhooks/veridian" required
              className="bg-[#0d1211] border border-white/[0.08] rounded-lg h-9 px-3 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#1d9e75] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/15 transition-colors w-full"
            />
          </div>

          <div className="mb-5">
            <p className="text-xs font-medium text-[#64748b] mb-1.5">Events</p>
            <div className="flex flex-col gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox" checked={selectedEvents.includes(event)} onChange={() => toggleEvent(event)}
                    className="w-4 h-4 rounded border-white/[0.20] bg-[#0d1211] accent-[#1d9e75]"
                  />
                  <span className="text-sm text-[#94a3b8] font-mono">{event}</span>
                </label>
              ))}
            </div>
          </div>

          {createError && (
            <div className="p-3 mb-4 rounded-lg bg-[#ef4444]/[0.08] border-l-[3px] border-[#ef4444]">
              <p className="text-sm text-[#ef4444]">{createError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={creating || !endpointUrl.trim() || selectedEvents.length === 0}
            className="inline-flex items-center gap-2 h-9 px-4 bg-[#1d9e75] text-[#050a09] text-[13px] font-medium rounded-lg hover:bg-[#22c55e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? (
              <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Adding…</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add endpoint</>
            )}
          </button>
        </form>
      </div>

      {/* Endpoints list */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-[#f8fafc]">Endpoints</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm text-[#64748b]">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Loading…
            </div>
          </div>
        ) : endpoints.length === 0 ? (
          <EmptyState
            icon={<svg className="w-4 h-4" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
            title="No webhook endpoints yet"
            description="Add an endpoint above to start receiving verification events."
          />
        ) : (
          <div>
            {endpoints.map((ep) => (
              <div key={ep.id} className="px-5 py-4 flex items-center gap-4 border-b border-white/[0.04] last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-[#f8fafc] truncate mb-1.5" title={ep.url}>{ep.url}</p>
                  <div className="flex flex-wrap gap-1">
                    {ep.events.map((evt) => <EventBadge key={evt} event={evt} />)}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-[#64748b]">{ep.enabled ? "Enabled" : "Disabled"}</span>
                  <Toggle enabled={ep.enabled} onChange={(v) => handleToggle(ep.id, v)} />
                </div>
                <div className="shrink-0">
                  {deleteConfirm === ep.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs hidden sm:inline text-[#94a3b8]">Delete?</span>
                      <button onClick={() => handleDelete(ep.id)} disabled={deleting}
                        className="inline-flex items-center h-7 px-3 bg-[#ef4444]/[0.12] border border-[#ef4444]/[0.25] text-[#ef4444] text-xs font-medium rounded-lg hover:bg-[#ef4444]/[0.20] transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirm(null)}
                        className="inline-flex items-center h-7 px-3 border border-white/10 text-[#94a3b8] text-xs font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(ep.id)}
                      className="inline-flex items-center h-7 px-3 text-[#64748b] text-xs font-medium rounded-lg hover:bg-white/[0.04] hover:text-[#ef4444] transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent deliveries */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-[#f8fafc]">Recent deliveries</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm text-[#64748b]">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Loading…
            </div>
          </div>
        ) : deliveries.length === 0 ? (
          <EmptyState
            icon={<svg className="w-4 h-4" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            title="No deliveries yet"
            description="Deliveries appear here after verifications trigger your endpoints."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr>
                  {["Event", "Status", "Endpoint", "Time"].map((col) => (
                    <th key={col} className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] px-4 py-3 border-b border-white/[0.08] text-left">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const endpoint = endpointById[d.endpoint_id];
                  return (
                    <tr key={d.id} className="hover:bg-white/[0.02] transition-colors duration-150">
                      <td className="px-4 py-3.5 border-b border-white/[0.04]">
                        <span className="text-sm font-mono text-[#94a3b8]">{d.event}</span>
                      </td>
                      <td className="px-4 py-3.5 border-b border-white/[0.04]">
                        <DeliveryStatus success={d.success} statusCode={d.status_code} />
                      </td>
                      <td className="px-4 py-3.5 border-b border-white/[0.04] max-w-[240px]">
                        <span className="block truncate text-sm text-[#64748b]" title={endpoint?.url ?? d.endpoint_id}>
                          {endpoint?.url ?? <span className="font-mono">{d.endpoint_id.slice(0, 8)}…</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 border-b border-white/[0.04] text-xs text-[#64748b] whitespace-nowrap">
                        {new Date(d.attempted_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
