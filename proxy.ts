import { NextResponse, type NextRequest } from "next/server";

// Next.js 16+ uses "proxy" export convention (previously "middleware")
export async function proxy(request: NextRequest) {
  // Protected routes
  const protectedPaths = [
    "/dashboard",
    "/dashboard/safety",
    "/dashboard/profile",
    "/dashboard/command",
    "/dashboard/vault",
    "/dashboard/saferoute",
    "/dashboard/metrics",
  ];

  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!isProtected) return NextResponse.next();

  try {
    const { createServerClient } = await import("@/lib/supabase/server");
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  } catch {
    // Supabase not configured yet — allow access for demo
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
