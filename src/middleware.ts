import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Check role from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "vendedor")) {
      return NextResponse.redirect(new URL("/tienda", request.url));
    }

    // Vendedor cannot access config or users
    if (profile.role === "vendedor") {
      if (
        pathname.startsWith("/admin/configuracion") ||
        pathname.startsWith("/admin/usuarios")
      ) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
  }

  // Protect checkout and profile routes
  if (
    pathname.startsWith("/tienda/checkout") ||
    pathname.startsWith("/tienda/mis-pedidos") ||
    pathname.startsWith("/tienda/mi-perfil")
  ) {
    if (!user) {
      return NextResponse.redirect(
        new URL(`/auth/login?redirect=${encodeURIComponent(pathname)}`, request.url)
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
