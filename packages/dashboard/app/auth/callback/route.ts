import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  console.log("[AUTH CALLBACK]", {
    code: !!code,
    token_hash: !!token_hash,
    type,
    origin,
    next,
  });

  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                maxAge: 60 * 60 * 24 * 7,
                sameSite: "lax",
                httpOnly: true,
                secure: true,
              });
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    console.log("[AUTH CALLBACK] verifyOtp result:", {
      error: error ? { message: error.message, status: error.status } : null,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&reason=${encodeURIComponent(error.message)}`
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                maxAge: 60 * 60 * 24 * 7,
                sameSite: "lax",
                httpOnly: true,
                secure: true,
              });
            });
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[AUTH CALLBACK] exchangeCodeForSession result:", {
      error: error ? { message: error.message, status: error.status } : null,
    });

    if (!error) return NextResponse.redirect(`${origin}${next}`);

    return NextResponse.redirect(
      `${origin}/login?error=auth_failed&reason=${encodeURIComponent(error.message)}`
    );
  }

  console.log("[AUTH CALLBACK] no code or token_hash present — redirecting to login");
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
