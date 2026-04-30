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
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 500,
        backgroundColor: "rgba(29,158,117,0.10)",
        color: "#1d9e75",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {event}
    </span>
  );
}

function DeliveryStatus({ success, statusCode }: { success: boolean; statusCode: number | null }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        fontFamily: "var(--font-mono)",
        backgroundColor: success ? "rgba(22,163,74,0.12)" : "rgba(220,38,38,0.12)",
        color: success ? "#16a34a" : "#dc2626",
      }}
    >
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
      style={{
        position: "relative",
        width: 36,
        height: 20,
        borderRadius: 9999,
        backgroundColor: enabled ? "rgba(29,158,117,0.20)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${enabled ? "rgba(29,158,117,0.40)" : "rgba(255,255,255,0.12)"}`,
        cursor: "pointer",
        flexShrink: 0,
        transition: "background-color var(--transition-fast), border-color var(--transition-fast)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: enabled ? 16 : 2,
          width: 14,
          height: 14,
          borderRadius: 9999,
          backgroundColor: enabled ? "#1d9e75" : "#5a7268",
          transition: "left var(--transition-fast), background-color var(--transition-fast)",
        }}
      />
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
        <div
          className="mb-6 rounded-xl px-5 py-4"
          style={{
            backgroundColor: "rgba(220,38,38,0.10)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderLeft: "3px solid #dc2626",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "#dc2626" }}>
            {loadError}
          </p>
        </div>
      )}

      {/* ── Section 1: Create endpoint ──────────────────────────────────────── */}

      {/* Secret shown once — displayed between form and endpoints list */}
      {newSecret && (
        <div
          className="mb-5 rounded-xl p-5"
          style={{
            backgroundColor: "rgba(217,119,6,0.08)",
            border: "1px solid rgba(217,119,6,0.30)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: "rgba(217,119,6,0.15)" }}
            >
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
              <p className="text-sm font-semibold mb-3" style={{ color: "#d97706" }}>
                Save this secret now — it won&apos;t be shown again
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <code
                  className="flex-1 text-xs px-3 py-2 rounded-lg break-all min-w-0"
                  style={{
                    fontFamily: "var(--font-mono)",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "#a8ff78",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {newSecret.secret}
                </code>
                <button
                  onClick={copySecret}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium hover:opacity-80"
                  style={{
                    border: "1px solid rgba(217,119,6,0.40)",
                    color: "#d97706",
                    height: 36,
                    padding: "0 12px",
                    borderRadius: 8,
                    backgroundColor: "transparent",
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {secretCopied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => setNewSecret(null)}
                  className="shrink-0 text-xs font-medium hover:opacity-80"
                  style={{
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "#a3b3ae",
                    height: 36,
                    padding: "0 12px",
                    borderRadius: 8,
                    backgroundColor: "transparent",
                  }}
                >
                  Dismiss
                </button>
              </div>
              <p className="mt-2 text-xs" style={{ color: "#a3b3ae" }}>
                Use this secret to verify{" "}
                <span style={{ fontFamily: "var(--font-mono)", color: "#f0f4f3" }}>
                  X-Veridian-Signature
                </span>{" "}
                on incoming requests.
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className="rounded-xl p-6 mb-5"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <h2 className="text-sm font-semibold mb-5" style={{ color: "#f0f4f3" }}>
          Add endpoint
        </h2>

        <form onSubmit={handleCreate}>
          {/* URL input */}
          <div className="mb-4">
            <label
              htmlFor="webhook-url"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 500,
                color: "#a3b3ae",
                marginBottom: 6,
                letterSpacing: "0.02em",
              }}
            >
              Endpoint URL
            </label>
            <input
              id="webhook-url"
              type="url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="https://yourapp.com/webhooks/veridian"
              required
              className="w-full focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "#0d1211",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#f0f4f3",
                height: 36,
                padding: "0 12px",
                borderRadius: 8,
                fontSize: 14,
                fontFeatureSettings: '"cv01","ss03"',
                "--tw-ring-color": "#1d9e75",
              } as React.CSSProperties}
            />
          </div>

          {/* Events */}
          <div className="mb-5">
            <p
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#a3b3ae",
                marginBottom: 10,
                letterSpacing: "0.02em",
              }}
            >
              Events
            </p>
            <div className="flex flex-col gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <label
                  key={event}
                  className="flex items-center gap-2 cursor-pointer"
                  style={{ width: "fit-content" }}
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    style={{
                      accentColor: "#1d9e75",
                      width: 14,
                      height: 14,
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      color: "#a3b3ae",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {event}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {createError && (
            <div
              className="mb-4 rounded-lg px-4 py-3"
              style={{
                backgroundColor: "rgba(220,38,38,0.10)",
                border: "1px solid rgba(220,38,38,0.25)",
                borderLeft: "3px solid #dc2626",
              }}
            >
              <p className="text-sm" style={{ color: "#dc2626" }}>{createError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={creating || !endpointUrl.trim() || selectedEvents.length === 0}
            className="inline-flex items-center gap-2 text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: "#1d9e75",
              color: "#050a09",
              height: 36,
              padding: "0 16px",
              borderRadius: 8,
              transition: "150ms ease",
            }}
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

      <div
        className="rounded-xl overflow-hidden mb-5"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "#f0f4f3" }}>
            Endpoints
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm" style={{ color: "#a3b3ae" }}>
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
            {endpoints.map((ep, idx) => (
              <div
                key={ep.id}
                className="px-6 py-4 flex items-center gap-4"
                style={{
                  borderBottom:
                    idx < endpoints.length - 1
                      ? "1px solid rgba(255,255,255,0.04)"
                      : "none",
                }}
              >
                {/* URL + events */}
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate mb-1.5"
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#f0f4f3",
                    }}
                    title={ep.url}
                  >
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
                  <span style={{ fontSize: 12, color: "#5a7268" }}>
                    {ep.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <Toggle
                    enabled={ep.enabled}
                    onChange={(v) => handleToggle(ep.id, v)}
                  />
                </div>

                {/* Delete */}
                <div className="shrink-0">
                  {deleteConfirm === ep.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs hidden sm:inline" style={{ color: "#a3b3ae" }}>
                        Delete this endpoint?
                      </span>
                      <button
                        onClick={() => handleDelete(ep.id)}
                        disabled={deleting}
                        className="text-xs font-medium disabled:opacity-40"
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
                        onClick={() => setDeleteConfirm(null)}
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
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(ep.id)}
                      className="text-xs font-medium hover:opacity-80"
                      style={{ color: "#dc2626" }}
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

      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "#f0f4f3" }}>
            Recent deliveries
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm" style={{ color: "#a3b3ae" }}>
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
            <table
              className="w-full min-w-[640px]"
              style={{ borderCollapse: "collapse", fontSize: 14 }}
            >
              <thead>
                <tr>
                  {["Event", "Status", "Endpoint", "Time"].map((col) => (
                    <th
                      key={col}
                      className="text-left"
                      style={{
                        padding: "12px 16px",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#5a7268",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d, idx) => {
                  const endpoint = endpointById[d.endpoint_id];
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-[120ms]"
                      style={{
                        borderBottom:
                          idx < deliveries.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                      }}
                    >
                      <td style={{ padding: "16px 16px" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: "var(--font-mono)",
                            color: "#a3b3ae",
                          }}
                        >
                          {d.event}
                        </span>
                      </td>
                      <td style={{ padding: "16px 16px" }}>
                        <DeliveryStatus success={d.success} statusCode={d.status_code} />
                      </td>
                      <td
                        style={{
                          padding: "16px 16px",
                          maxWidth: 280,
                        }}
                      >
                        <span
                          className="block truncate"
                          title={endpoint?.url ?? d.endpoint_id}
                          style={{ fontSize: 13, color: "#a3b3ae" }}
                        >
                          {endpoint?.url ?? (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#5a7268" }}>
                              {d.endpoint_id.slice(0, 8)}…
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: "16px 16px", color: "#5a7268", fontSize: 13, whiteSpace: "nowrap" }}>
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
