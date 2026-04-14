import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  console.log("[AUTH CALLBACK]", {
    code: !!code,
    token_hash: !!token_hash,
    type,
    origin,
  });

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
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  let error = null;

  if (token_hash && type) {
    const result = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    console.log("[AUTH CALLBACK] verifyOtp result:", {
      error: result.error
        ? { message: result.error.message, status: result.error.status }
        : null,
    });
    error = result.error;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    console.log("[AUTH CALLBACK] exchangeCodeForSession result:", {
      error: result.error
        ? { message: result.error.message, status: result.error.status }
        : null,
    });
    error = result.error;
  } else {
    console.log("[AUTH CALLBACK] no token_hash or code present");
  }

  if (!error) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=auth_failed&reason=${encodeURIComponent(error?.message ?? "unknown")}`
  );
}
