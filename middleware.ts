import { type NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  console.log("[v0] [MIDDLEWARE] Request to:", request.nextUrl.pathname)

  const response = NextResponse.next()

  // Protected routes
  const protectedRoutes = ["/chat", "/profile", "/workspaces", "/custom-agents"]
  const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute) {
    // Check for any Supabase auth cookie (they start with 'sb-')
    const allCookies = request.cookies.getAll()
    console.log(
      "[v0] [MIDDLEWARE] All cookies:",
      allCookies.map((c) => c.name),
    )

    const authCookies = allCookies.filter((cookie) => cookie.name.includes("sb-") && cookie.name.includes("auth"))

    console.log(
      "[v0] [MIDDLEWARE] Auth cookies found:",
      authCookies.map((c) => c.name),
    )

    // If no auth cookies found, redirect to login
    if (authCookies.length === 0) {
      console.log("[v0] [MIDDLEWARE] No auth cookies, redirecting to /login")
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    console.log("[v0] [MIDDLEWARE] Auth cookies present, allowing access")
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
