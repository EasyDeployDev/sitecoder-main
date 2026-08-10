import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/access(.*)",
  "/share(.*)",
  "/checkout(.*)",
  "/api/webhook(.*)",
  "/api/og(.*)",
  "/favicon.ico",
  "/robots.txt",
  "/icon.png",
  "/og-image.png",
  "/logo.svg",
  "/Aeonik(.*)",
]);

const APP_ROLE = process.env.APP_ROLE === "workspace" ? "workspace" : "main";

/**
 * Use the Clerk Frontend API CNAME (clerk.useprivy.app from the publishable
 * key) — do not enable frontendApiProxy unless proxy_url is also set on the
 * domain in the Clerk Dashboard. Proxy without that registration returns
 * host_invalid on /__clerk handshake.
 */
export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  if (APP_ROLE === "workspace" && pathname === "/") {
    return NextResponse.redirect(new URL("/chats", request.url));
  }

  // Waitlist retired — send old links home.
  if (pathname === "/waitlist" || pathname.startsWith("/waitlist/")) {
    return NextResponse.redirect(new URL("/access", request.url));
  }

  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Landing stays reachable; chat/API require Clerk.
  if (pathname === "/") {
    return NextResponse.next();
  }

  await auth.protect({
    unauthenticatedUrl: new URL(
      `/login?redirectTo=${encodeURIComponent(pathname)}`,
      request.url,
    ).toString(),
  });

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|ttf|otf|woff|woff2)$).*)",
    "/(api|trpc)(.*)",
  ],
};
