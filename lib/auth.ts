import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { AuthUser, GlobalRole, WaitlistStatus } from "@/lib/rbac";

const SESSION_COOKIE = "sitecoder_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function toAuthUser(row: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as GlobalRole,
    status: row.status as WaitlistStatus,
  };
}

export async function createSession(userId: string): Promise<string> {
  const prisma = getPrisma();
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });

  return session.id;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    const prisma = getPrisma();
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE);
}

// cache() dedupes within a single request/render pass.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  // Defensive: if an admin revokes approval (or rejects a previously
  // approved user) after a session was already issued, treat the session
  // as invalid rather than trusting the stale grant.
  if (session.user.status !== "APPROVED") {
    return null;
  }

  return toAuthUser(session.user);
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    const { UnauthorizedError } = await import("@/lib/rbac");
    throw new UnauthorizedError();
  }
  return user;
}

export type SignUpResult =
  | { ok: true; user: AuthUser; waitlisted: boolean }
  | { ok: false; error: string };

// Signup always creates the credential account (User row) immediately —
// this is the "credential account" from the nanodb-orm-examples auth
// pattern — so the email is reserved and the password is hashed and
// stored right away. What differs from that pattern is that we don't
// issue a Session (i.e. we don't log the user in) unless the account is
// already APPROVED. New accounts land in the waitlist as PENDING and an
// admin/owner must approve them (see lib/waitlist.ts) before a session can
// ever be created for them.
export async function signUp(
  email: string,
  password: string,
  name?: string,
): Promise<SignUpResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return { ok: false, error: "An account with that email already exists." };
  }

  // The very first user to sign up becomes the workspace OWNER (and is
  // auto-approved, so there's always at least one admin able to review the
  // waitlist); everyone else starts as a MEMBER pending approval.
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;
  const role: GlobalRole = isFirstUser ? "OWNER" : "MEMBER";

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || null,
      role,
      status: isFirstUser ? "APPROVED" : "PENDING",
    },
  });

  if (isFirstUser) {
    await createSession(user.id);
    return { ok: true, user: toAuthUser(user), waitlisted: false };
  }

  return { ok: true, user: toAuthUser(user), waitlisted: true };
}

export type SignInResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string }
  | { ok: false; error: string; waitlisted: true };

export async function signIn(
  email: string,
  password: string,
): Promise<SignInResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }

  if (user.status === "REJECTED") {
    return {
      ok: false,
      error: "This account's waitlist request was declined.",
    };
  }

  if (user.status === "PENDING") {
    return {
      ok: false,
      error: "You're still on the waitlist. We'll email you once you're approved.",
      waitlisted: true,
    };
  }

  await createSession(user.id);
  return { ok: true, user: toAuthUser(user) };
}
