"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { PageHeader } from "../_components/PageHeader";
import { EmptyState } from "../_components/EmptyState";

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Sub-components ────────────────────────────────────────────────────────────

function EventBadge({ event }: { event: string }) {
  return <span className="vd-event-badge">{event}</span>;
}

function DeliveryStatus({ success, statusCode }: { success: boolean; statusCode: number | null }) {
  return (
    <span className={success ? "vd-delivery-success" : "vd-delivery-fail"}>
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
      className={`vd-toggle ${enabled ? "vd-toggle-on" : "vd-toggle-off"}`}
    >
      <span className={`vd-toggle-knob ${enabled ? "vd-toggle-knob-on" : "vd-toggle-knob-off"}`} />
    </button>
  );
}

const AVAILABLE_EVENTS = ["verification.completed", "verification.failed"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Create form
  const [endpointUrl, setEndpointUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    "verification.completed",
    "verification.failed",
  ]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<{ endpointId: string; secret: string } | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── API helpers ─────────────────────────────────────────────────────────────

  async function getToken(): Promise<string> {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated — please sign in again");
    return session.access_token;
  }

  async function apiFetch<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T | null> {
    const token = await getToken();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }
    return res.json();
  }

  // ── Load data ───────────────────────────────────────────────────────────────

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

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!endpointUrl.trim() || selectedEvents.length === 0) return;
    setCreating(true);
    setCreateError(null);
    setNewSecret(null);

    try {
      const result = await apiFetch<WebhookEndpoint & { secret: string }>(
        "POST",
        "/v1/webhooks",
        { url: endpointUrl.trim(), events: selectedEvents }
      );
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
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const endpointById = Object.fromEntries(endpoints.map((ep) => [ep.id, ep]));

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader title="Webhooks" subtitle="Receive real-time notifications when verifications complete" />

      {/* Load error */}
      {loadError && (
        <div className="vd-alert vd-alert-danger mb-6">
          <p className="text-sm font-medium vd-text-danger">{loadError}</p>
        </div>
      )}

      {/* ── Secret shown once ───────────────────────────────────────────────── */}
      {newSecret && (
        <div className="vd-secret-banner mb-5">
          <div className="flex items-start gap-3">
            <div className="vd-icon-warning-sm w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="#d97706" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold mb-3 vd-text-warning">
                Save this secret now — it won&apos;t be shown again
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="vd-secret-code flex-1 break-all min-w-0">
                  {newSecret.secret}
                </code>
                <button onClick={copySecret} className="vd-btn-warning-sm shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {secretCopied ? "Copied" : "Copy"}
                </button>
                <button onClick={() => setNewSecret(null)} className="vd-btn-ghost-sm shrink-0">
                  Dismiss
                </button>
              </div>
              <p className="mt-2 text-xs vd-text-secondary">
                Use this secret to verify{" "}
                <span className="vd-mono-brand">X-Veridian-Signature</span>{" "}
                on incoming requests.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 1: Create endpoint ──────────────────────────────────────── */}

      <div className="vd-section-card-p mb-5">
        <h2 className="vd-section-title mb-5">Add endpoint</h2>

        <form onSubmit={handleCreate}>
          {/* URL input */}
          <div className="mb-4">
            <label htmlFor="webhook-url" className="vd-field-label-sm">
              Endpoint URL
            </label>
            <input
              id="webhook-url"
              type="url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://yourapp.com/webhooks/veridian"
              required
              className="vd-input w-full"
            />
          </div>

          {/* Events */}
          <div className="mb-5">
            <p className="vd-field-label-sm">Events</p>
            <div className="flex flex-col gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="vd-checkbox"
                  />
                  <span className="vd-event-text">{event}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {createError && (
            <div className="vd-alert vd-alert-danger mb-4">
              <p className="text-sm vd-text-danger">{createError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={creating || !endpointUrl.trim() || selectedEvents.length === 0}
            className="vd-btn vd-btn-primary"
          >
            {creating ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add endpoint
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Section 2: Endpoints list ────────────────────────────────────────── */}

      <div className="vd-section-card mb-5">
        <div className="vd-section-header px-6 py-4">
          <h2 className="vd-section-title">Endpoints</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm vd-loading-text">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading…
            </div>
          </div>
        ) : endpoints.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-4 h-4" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
            title="No webhook endpoints yet"
            description="Add an endpoint above to start receiving verification events."
          />
        ) : (
          <div>
            {endpoints.map((ep) => (
              <div key={ep.id} className="vd-webhook-row px-6 py-4 flex items-center gap-4">
                {/* URL + events */}
                <div className="flex-1 min-w-0">
                  <p className="vd-endpoint-url truncate mb-1.5" title={ep.url}>
                    {ep.url}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {ep.events.map((evt) => (
                      <EventBadge key={evt} event={evt} />
                    ))}
                  </div>
                </div>

                {/* Toggle */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="vd-toggle-label">{ep.enabled ? "Enabled" : "Disabled"}</span>
                  <Toggle enabled={ep.enabled} onChange={(v) => handleToggle(ep.id, v)} />
                </div>

                {/* Delete */}
                <div className="shrink-0">
                  {deleteConfirm === ep.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs hidden sm:inline vd-text-secondary">
                        Delete this endpoint?
                      </span>
                      <button
                        onClick={() => handleDelete(ep.id)}
                        disabled={deleting}
                        className="vd-btn vd-btn-danger vd-btn-sm"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="vd-btn vd-btn-secondary vd-btn-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(ep.id)}
                      className="vd-btn vd-btn-ghost vd-btn-sm vd-delete-btn"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 3: Recent deliveries ─────────────────────────────────────── */}

      <div className="vd-section-card">
        <div className="vd-section-header px-6 py-4">
          <h2 className="vd-section-title">Recent deliveries</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm vd-loading-text">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading…
            </div>
          </div>
        ) : deliveries.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-4 h-4" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            title="No deliveries yet"
            description="Deliveries appear here after verifications trigger your endpoints."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="vd-deliveries-table">
              <thead>
                <tr>
                  {["Event", "Status", "Endpoint", "Time"].map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const endpoint = endpointById[d.endpoint_id];
                  return (
                    <tr key={d.id} className="vd-delivery-row hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-[120ms]">
                      <td>
                        <span className="vd-delivery-event">{d.event}</span>
                      </td>
                      <td>
                        <DeliveryStatus success={d.success} statusCode={d.status_code} />
                      </td>
                      <td className="vd-delivery-endpoint">
                        <span className="block truncate" title={endpoint?.url ?? d.endpoint_id}>
                          {endpoint?.url ?? (
                            <span className="vd-delivery-id-mono">
                              {d.endpoint_id.slice(0, 8)}…
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="vd-delivery-time">
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
