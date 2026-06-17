import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Next 16: this file replaces the deprecated `middleware.ts`.
// Cookies are read/written synchronously on the request/response here.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the auth token and tells us if the user is signed in.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/dashboard/login";

  // Not signed in + hitting a protected dashboard route → send to login.
  if (!user && !isLogin) {
    return NextResponse.redirect(new URL("/dashboard/login", request.url));
  }

  // Already signed in + on the login page → send to the inbox.
  if (user && isLogin) {
    return NextResponse.redirect(new URL("/dashboard/triage", request.url));
  }

  return response;
}

export const config = {
  // Only run on dashboard routes.
  matcher: ["/dashboard/:path*"],
};
