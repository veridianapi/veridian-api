"use server";

import { createClient } from "@/lib/supabase-server";

export async function sendSupportEmail({
  subject,
  message,
}: {
  subject: string;
  message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated." };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Email service not configured." };

  const userEmail = user.email ?? "unknown@unknown.com";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Veridian Dashboard <noreply@veridianapi.com>",
      to: ["support@veridianapi.com"],
      reply_to: userEmail,
      subject: `[Support] ${subject}`,
      text: `From: ${userEmail}\nSubject: ${subject}\n\n${message}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "unknown error");
    return { ok: false, error: `Failed to send message (${res.status}). Please try again.` };
  }

  return { ok: true };
}
