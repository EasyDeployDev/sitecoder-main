import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "sitecoder_session";

// Paths that never require a session. Everything else (including "/",
// "/chats", and the chat-creation/completion APIs) requires a signed-in
// user. Shared links stay public by design.
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/share",
  "/api/og",
  "/favicon.ico",
  "/robots.txt",
  "/icon.png",
  "/og-image.png",
  "/logo.svg",
  "/Aeonik",
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Optimistic, edge-safe gate: just checks for the presence of a session
// cookie so unauthenticated users are redirected before any page renders.
// The real session validation (expiry, user lookup, RBAC) happens
// server-side in lib/auth.ts + lib/rbac.ts for every data access.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirectTo", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|ttf|otf|woff|woff2)$).*)",
  ],
};
