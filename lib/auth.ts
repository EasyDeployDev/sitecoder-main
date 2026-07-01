import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { getPrisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { AuthUser, GlobalRole } from "@/lib/rbac";

const SESSION_COOKIE = "sitecoder_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function toAuthUser(row: {
  id: string;
  email: string;
  name: string | null;
  role: string;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as GlobalRole,
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
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

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

  // The very first user to sign up becomes the workspace OWNER; everyone
  // else starts as a MEMBER and can be promoted by an admin.
  const userCount = await prisma.user.count();
  const role: GlobalRole = userCount === 0 ? "OWNER" : "MEMBER";

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || null,
      role,
    },
  });

  await createSession(user.id);
  return { ok: true, user: toAuthUser(user) };
}

export type SignInResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

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

  await createSession(user.id);
  return { ok: true, user: toAuthUser(user) };
}
