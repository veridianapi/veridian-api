"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

const COOLDOWN_SECONDS = 60;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionExpired(params.get("expired") === "1");
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleOAuth(provider: "github" | "google") {
    setError(null);
    setOauthLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
    // On success, browser redirects — no need to reset loading
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) return;
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
      startCooldown();
    }
    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#0a0f0e" }}
    >
      <div className="w-full max-w-md">
        {/* Session expired banner */}
        {sessionExpired && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm"
            style={{
              backgroundColor: "rgba(234,179,8,0.10)",
              border: "1px solid rgba(234,179,8,0.25)",
              color: "#fbbf24",
            }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Session expired — please sign in again.
          </div>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{ backgroundColor: "rgba(29,158,117,0.15)" }}
          >
            <svg className="w-7 h-7" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Veridian</h1>
          <p className="mt-1" style={{ color: "#a3b3ae" }}>
            Sign in to your dashboard
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: "#111916", border: "1px solid #1a2b25" }}
        >
          {sent ? (
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "rgba(29,158,117,0.15)" }}
              >
                <svg className="w-6 h-6" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
              <p className="text-sm mb-4" style={{ color: "#a3b3ae" }}>
                We sent a magic link to <strong className="text-white">{email}</strong>. Click it to sign in.
              </p>
              {cooldown > 0 ? (
                <p className="text-xs" style={{ color: "#5a7068" }}>
                  Resend in {cooldown}s…
                </p>
              ) : (
                <button
                  onClick={handleSubmit as unknown as React.MouseEventHandler}
                  className="text-sm font-medium"
                  style={{ color: "#1d9e75" }}
                >
                  Resend magic link
                </button>
              )}
            </div>
          ) : (
            <>
              {/* OAuth buttons */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleOAuth("github")}
                  disabled={oauthLoading !== null}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg text-sm font-medium text-white disabled:opacity-60 min-h-[44px]"
                  style={{ backgroundColor: "#24292e" }}
                >
                  <GitHubIcon />
                  {oauthLoading === "github" ? "Redirecting…" : "Continue with GitHub"}
                </button>
                <button
                  onClick={() => handleOAuth("google")}
                  disabled={oauthLoading !== null}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-60 min-h-[44px]"
                  style={{ backgroundColor: "#ffffff", color: "#1f2937" }}
                >
                  <GoogleIcon />
                  {oauthLoading === "google" ? "Redirecting…" : "Continue with Google"}
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: "1px solid #1a2b25" }} />
                </div>
                <div className="relative flex justify-center">
                  <span
                    className="px-3 text-xs"
                    style={{ backgroundColor: "#111916", color: "#5a7068" }}
                  >
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Magic link form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: "#a3b3ae" }}>
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 min-h-[44px]"
                    style={{
                      backgroundColor: "#0a0f0e",
                      border: "1px solid #1a2b25",
                      color: "#ffffff",
                      "--tw-ring-color": "#1d9e75",
                    } as React.CSSProperties}
                  />
                </div>

                {error && (
                  <p
                    className="text-sm rounded-lg px-3 py-2"
                    style={{ color: "#f87171", backgroundColor: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.20)" }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  className="w-full py-2.5 px-4 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer min-h-[44px]"
                  style={{ backgroundColor: "#1d9e75" }}
                >
                  {loading
                    ? "Sending…"
                    : cooldown > 0
                    ? `Resend in ${cooldown}s…`
                    : "Send magic link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
