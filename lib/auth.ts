import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { randomBytes, createHash } from "crypto";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { AuthUser, GlobalRole, WaitlistStatus } from "@/lib/rbac";

const SESSION_COOKIE = "sitecoder_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Cookie prefixes harden against session fixation / cookie tossing:
// __Host- requires Secure, Path=/, and no Domain attribute.
const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-sitecoder_session" : SESSION_COOKIE;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

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
  const token = generateSessionToken();
  const tokenHash = hashToken(token);

  const session = await prisma.session.create({
    data: {
      id: tokenHash,
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
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
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const prisma = getPrisma();
    await prisma.session.delete({ where: { id: hashToken(token) } }).catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

// cache() dedupes within a single request/render pass.
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
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

export async function deleteExpiredSessions(): Promise<number> {
  const prisma = getPrisma();
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

export async function deleteUserSessions(userId: string): Promise<number> {
  const prisma = getPrisma();
  const { count } = await prisma.session.deleteMany({ where: { userId } });
  return count;
}

export type SignUpResult =
  | { ok: true; user: AuthUser; waitlisted: boolean }
  | { ok: false; error: string };

// Signup always creates the credential account (User row) immediately —
// this is the "credential account" from the nanodb-orm-examples auth
// pattern — so the email is reserved and the password is hashed and
// stored right away. What differs from that pattern is that we don't
// issue a Session (i.e. we don't log the user in) unless the account is
// already APPROVED. New accounts always land in the waitlist as PENDING
// and an admin/owner must approve them (see lib/waitlist.ts) before a
// session can ever be created for them.
export async function signUp(
  email: string,
  password: string,
  name?: string,
): Promise<SignUpResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.ok) {
    return { ok: false, error: passwordCheck.error };
  }

  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || null,
      role: "MEMBER",
      status: "PENDING",
    },
  });

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

function validatePasswordStrength(password: string): { ok: true } | { ok: false; error: string } {
  if (password.length < 10) {
    return { ok: false, error: "Password must be at least 10 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, error: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "Password must contain at least one number." };
  };
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, error: "Password must contain at least one special character." };
  }
  return { ok: true };
}
